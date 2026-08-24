import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { sectionTemplates } from "../../db/schema/sectionTemplates";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SUPER_ADMIN_EMAIL: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;   // e.g. "kekalstudio/kekal-front"
  GITHUB_BRANCH: string; // e.g. "main"
};
type Variables = {
  userId: string; email: string; isSuperAdmin: boolean; permissions: string[];
};

export const adminSectionTemplatesRouter = new Hono<{
  Bindings: Bindings; Variables: Variables;
}>();

// ── GET all templates ────────────────────────────────────────────────────────
adminSectionTemplatesRouter.get(
  "/",
  authMiddleware,
  requirePermission("page_sections", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    return c.json(await db.select().from(sectionTemplates));
  },
);

// ── GET single template ──────────────────────────────────────────────────────
adminSectionTemplatesRouter.get(
  "/:id",
  authMiddleware,
  requirePermission("page_sections", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const rows = await db
      .select()
      .from(sectionTemplates)
      .where(eq(sectionTemplates.id, c.req.param("id")));
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    return c.json(rows[0]);
  },
);

// ── POST — create template ───────────────────────────────────────────────────
adminSectionTemplatesRouter.post(
  "/",
  authMiddleware,
  requirePermission("page_sections", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const data = pickFields(body, ALLOWED_FIELDS.sectionTemplates);
    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      published: false,
      ...data,
    } as typeof sectionTemplates.$inferInsert;
    await db.insert(sectionTemplates).values(record);
    return c.json(record, 201);
  },
);

// ── PATCH — update template ──────────────────────────────────────────────────
adminSectionTemplatesRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("page_sections", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const data = pickFields(body, ALLOWED_FIELDS.sectionTemplates);
    await db
      .update(sectionTemplates)
      .set(data)
      .where(eq(sectionTemplates.id, c.req.param("id")));
    const rows = await db
      .select()
      .from(sectionTemplates)
      .where(eq(sectionTemplates.id, c.req.param("id")));
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    return c.json(rows[0]);
  },
);

// ── DELETE ───────────────────────────────────────────────────────────────────
adminSectionTemplatesRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("page_sections", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const rows = await db
      .select()
      .from(sectionTemplates)
      .where(eq(sectionTemplates.id, c.req.param("id")));
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    await db
      .delete(sectionTemplates)
      .where(eq(sectionTemplates.id, c.req.param("id")));
    return c.json({ message: "Deleted" });
  },
);

// ── POST /:id/publish — push TSX + CSS to GitHub ─────────────────────────────
adminSectionTemplatesRouter.post(
  "/:id/publish",
  authMiddleware,
  requirePermission("page_sections", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);

    const rows = await db
      .select()
      .from(sectionTemplates)
      .where(eq(sectionTemplates.id, c.req.param("id")));
    const template = rows[0];
    if (!template) return c.json({ error: "Not found" }, 404);
    if (!template.tsx_code) return c.json({ error: "No TSX code to publish" }, 400);

    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = c.env;
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return c.json({ error: "GitHub not configured (GITHUB_TOKEN / GITHUB_REPO missing)" }, 500);
    }

    const branch = GITHUB_BRANCH || "main";
    const slug = template.slug;
    const tsxPath  = `kekal_front/src/kekal/components/${slug}.tsx`;
    const cssPath  = `kekal_front/src/kekal/components/${slug}.module.css`;

    const pushFile = async (path: string, content: string) => {
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
      const headers = {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      };

      // Check if file already exists (to get its sha for update)
      let sha: string | undefined;
      const existing = await fetch(apiUrl, { headers });
      if (existing.ok) {
        const data = await existing.json() as { sha: string };
        sha = data.sha;
      }

      const body: Record<string, string> = {
        message: `Page Builder: ${sha ? "update" : "create"} ${path}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch,
      };
      if (sha) body.sha = sha;

      const res = await fetch(apiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(`GitHub error for ${path}: ${err.message}`);
      }
    };

    try {
      await pushFile(tsxPath, template.tsx_code);
      if (template.css_code) {
        await pushFile(cssPath, template.css_code);
      }

      // Mark as published
      await db
        .update(sectionTemplates)
        .set({ published: true })
        .where(eq(sectionTemplates.id, template.id));

      return c.json({ ok: true, tsxPath, cssPath: template.css_code ? cssPath : null });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  },
);