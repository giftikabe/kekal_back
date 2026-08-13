import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { componentLibrary } from "../../db/schema/componentLibrary";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";
import { commitFileToFrontend, getFileFromFrontend, deleteFileFromFrontend } from "../../lib/github";

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SUPER_ADMIN_EMAIL: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO_FRONTEND: string;
  GITHUB_BRANCH: string;
};
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminComponentLibraryRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Map snake_case keys extracted by pickFields() to the camelCase property
 * names Drizzle recognises.
 */
function mapToCamel(data: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = { ...data };
  if ("display_name" in mapped) {
    mapped.displayName = mapped.display_name;
    delete mapped.display_name;
  }
  if ("prop_schema" in mapped) {
    mapped.propSchema = mapped.prop_schema;
    delete mapped.prop_schema;
  }
  return mapped;
}

// GET / — list all components (metadata only — there's no code to omit anymore)
adminComponentLibraryRouter.get("/", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const results = await db
    .select()
    .from(componentLibrary)
    .orderBy(asc(componentLibrary.category), asc(componentLibrary.displayName));
  return c.json(results);
});

// GET /:id — single component metadata
adminComponentLibraryRouter.get("/:id", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(componentLibrary).where(eq(componentLibrary.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

// GET /:id/source — fetches the CURRENT source from GitHub (there is no DB copy).
// Returns { tsx, css } or 404 if it's a draft that's never been published.
adminComponentLibraryRouter.get(
  "/:id/source",
  authMiddleware,
  requirePermission("brand", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db.select().from(componentLibrary).where(eq(componentLibrary.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    const component = result[0];

    if (!component.githubPath) {
      return c.json({ error: "This component hasn't been published yet — nothing on GitHub to load." }, 404);
    }
    if (!c.env.GITHUB_TOKEN) {
      return c.json({ error: "GitHub not configured. Run: wrangler secret put GITHUB_TOKEN" }, 503);
    }

    const [tsxFile, cssFile] = await Promise.all([
      getFileFromFrontend(
        c.env.GITHUB_TOKEN,
        c.env.GITHUB_OWNER,
        c.env.GITHUB_REPO_FRONTEND,
        c.env.GITHUB_BRANCH,
        component.githubPath
      ),
      component.cssGithubPath
        ? getFileFromFrontend(
            c.env.GITHUB_TOKEN,
            c.env.GITHUB_OWNER,
            c.env.GITHUB_REPO_FRONTEND,
            c.env.GITHUB_BRANCH,
            component.cssGithubPath
          )
        : Promise.resolve(null),
    ]);

    if (!tsxFile) {
      return c.json({ error: "File not found on GitHub — it may have been deleted or renamed there." }, 404);
    }

    return c.json({ tsx: tsxFile.content, css: cssFile?.content ?? "" });
  }
);

// POST / — create DRAFT metadata (no code yet — code only exists once you Publish)
adminComponentLibraryRouter.post("/", authMiddleware, requirePermission("brand", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();

  if (!body.name || !/^[A-Z][A-Za-z0-9]+$/.test(body.name)) {
    return c.json({ error: "name must match /^[A-Z][A-Za-z0-9]+$/" }, 400);
  }

  const data = mapToCamel(pickFields(body, ALLOWED_FIELDS.componentLibrary));

  if (!data.displayName || String(data.displayName).trim() === "") {
    data.displayName = body.name.replace(/([a-z])([A-Z0-9])/g, "$1 $2");
  }
  if (!Array.isArray(data.propSchema)) data.propSchema = [];

  const now = new Date().toISOString();
  const newRecord = {
    id: crypto.randomUUID(),
    ...data,
    status: "draft",
    isCore: false,
    githubPath: null,
    cssGithubPath: null,
    createdAt: now,
    updatedAt: now,
  } as typeof componentLibrary.$inferInsert;

  await db.insert(componentLibrary).values(newRecord);
  return c.json(newRecord, 201);
});

// PATCH /:id — update metadata (display name / category / description / propSchema).
// Cannot change name, isCore, status, or the github path fields directly —
// those are only ever touched by /publish.
adminComponentLibraryRouter.patch("/:id", authMiddleware, requirePermission("brand", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();

  delete body.name;
  delete body.isCore;
  delete body.is_core;
  delete body.status;
  delete body.githubPath;
  delete body.github_path;

  const data = mapToCamel(pickFields(body, ALLOWED_FIELDS.componentLibrary));

  if ("displayName" in data && (!data.displayName || String(data.displayName).trim() === "")) {
    return c.json({ error: "displayName cannot be empty" }, 400);
  }

  const updatedAt = new Date().toISOString();
  await db.update(componentLibrary).set({ ...data, updatedAt }).where(eq(componentLibrary.id, c.req.param("id")));

  const result = await db.select().from(componentLibrary).where(eq(componentLibrary.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

// DELETE /:id — delete component (core components protected). Also removes
// the file(s) from GitHub if they were ever published, so the repo doesn't
// accumulate orphaned files.
adminComponentLibraryRouter.delete("/:id", authMiddleware, requirePermission("brand", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(componentLibrary).where(eq(componentLibrary.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  const component = result[0];
  if (component.isCore) return c.json({ error: "Core components cannot be deleted" }, 403);

  if (c.env.GITHUB_TOKEN && (component.githubPath || component.cssGithubPath)) {
    if (component.githubPath) {
      await deleteFileFromFrontend(
        c.env.GITHUB_TOKEN,
        c.env.GITHUB_OWNER,
        c.env.GITHUB_REPO_FRONTEND,
        c.env.GITHUB_BRANCH,
        component.githubPath,
        `chore: remove component ${component.name}`
      );
    }
    if (component.cssGithubPath) {
      await deleteFileFromFrontend(
        c.env.GITHUB_TOKEN,
        c.env.GITHUB_OWNER,
        c.env.GITHUB_REPO_FRONTEND,
        c.env.GITHUB_BRANCH,
        component.cssGithubPath,
        `chore: remove styles for ${component.name}`
      );
    }
  }

  await db.delete(componentLibrary).where(eq(componentLibrary.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});

// POST /:id/publish — THE ONLY place code ever gets written anywhere.
// Body: { tsx_code: string, css_code?: string }. The code is taken straight
// from the request, committed to GitHub, and then discarded — it is never
// written to Postgres.
adminComponentLibraryRouter.post("/:id/publish", authMiddleware, requirePermission("brand", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(componentLibrary).where(eq(componentLibrary.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  const component = result[0];

  const body = await c.req.json();
  const tsxCode: string = body.tsx_code ?? "";
  const cssCode: string = body.css_code ?? "";

  if (!tsxCode.trim()) {
    return c.json({ error: "Cannot publish a component with no code" }, 400);
  }

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO_FRONTEND, GITHUB_BRANCH } = c.env;
  if (!GITHUB_TOKEN) {
    return c.json({ success: false, error: "GitHub not configured. Run: wrangler secret put GITHUB_TOKEN" }, 503);
  }

  const tsxPath = `src/kekal/components/${component.name}.tsx`;
  const cssPath = `src/kekal/components/${component.name}.module.css`;

  const tsxResult = await commitFileToFrontend(
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO_FRONTEND,
    GITHUB_BRANCH,
    tsxPath,
    tsxCode,
    `feat: publish component ${component.name} from Component Library`
  );
  if (!tsxResult.success) {
    return c.json({ success: false, error: tsxResult.error });
  }

  if (cssCode.trim() !== "") {
    await commitFileToFrontend(
      GITHUB_TOKEN,
      GITHUB_OWNER,
      GITHUB_REPO_FRONTEND,
      GITHUB_BRANCH,
      cssPath,
      cssCode,
      `feat: publish styles for ${component.name} from Component Library`
    );
  }

  const updatedAt = new Date().toISOString();
  await db
    .update(componentLibrary)
    .set({
      status: "published",
      githubPath: tsxPath,
      cssGithubPath: cssCode.trim() !== "" ? cssPath : component.cssGithubPath,
      updatedAt,
    })
    .where(eq(componentLibrary.id, component.id));

  return c.json({ success: true, commit_url: tsxResult.commit_url, githubPath: tsxPath });
});
