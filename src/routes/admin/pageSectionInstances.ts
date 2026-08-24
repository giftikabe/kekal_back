import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pageSectionInstances } from "../../db/schema/pageSectionInstances";
import { sectionTemplates } from "../../db/schema/sectionTemplates";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminPageSectionInstancesRouter = new Hono<{
  Bindings: Bindings; Variables: Variables;
}>();

// ── GET all instances for a page (with template info joined) ─────────────────
adminPageSectionInstancesRouter.get(
  "/by-page/:pageId",
  authMiddleware,
  requirePermission("page_sections", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const instances = await db
      .select()
      .from(pageSectionInstances)
      .where(eq(pageSectionInstances.page_id, c.req.param("pageId")))
      .orderBy(asc(pageSectionInstances.layout_order));

    // Attach template info to each instance
    const templateIds = [...new Set(instances.map((i) => i.template_id))];
    const templates = templateIds.length
      ? await Promise.all(
          templateIds.map((tid) =>
            db
              .select()
              .from(sectionTemplates)
              .where(eq(sectionTemplates.id, tid))
              .then((r) => r[0]),
          ),
        )
      : [];

    const templateMap = Object.fromEntries(
      templates.filter(Boolean).map((t) => [t!.id, t]),
    );

    return c.json(
      instances.map((inst) => ({
        ...inst,
        template: templateMap[inst.template_id] ?? null,
      })),
    );
  },
);

// ── POST — add a section instance to a page ───────────────────────────────────
adminPageSectionInstancesRouter.post(
  "/",
  authMiddleware,
  requirePermission("page_sections", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const data = pickFields(body, ALLOWED_FIELDS.pageSectionInstances);
    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...data,
    } as typeof pageSectionInstances.$inferInsert;
    await db.insert(pageSectionInstances).values(record);
    // Return with template attached
    const template = await db
      .select()
      .from(sectionTemplates)
      .where(eq(sectionTemplates.id, record.template_id!))
      .then((r) => r[0] ?? null);
    return c.json({ ...record, template }, 201);
  },
);

// ── PATCH /reorder — bulk update layout_order ────────────────────────────────
adminPageSectionInstancesRouter.patch(
  "/reorder",
  authMiddleware,
  requirePermission("page_sections", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { updates } = await c.req.json() as {
      updates: Array<{ id: string; layout_order: number }>;
    };
    await Promise.all(
      updates.map(({ id, layout_order }) =>
        db
          .update(pageSectionInstances)
          .set({ layout_order })
          .where(eq(pageSectionInstances.id, id)),
      ),
    );
    return c.json({ ok: true });
  },
);

// ── PATCH /:id — update an instance (field_values, visibility, data_source) ──
adminPageSectionInstancesRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("page_sections", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const data = pickFields(body, ALLOWED_FIELDS.pageSectionInstances);
    await db
      .update(pageSectionInstances)
      .set(data)
      .where(eq(pageSectionInstances.id, c.req.param("id")));
    const rows = await db
      .select()
      .from(pageSectionInstances)
      .where(eq(pageSectionInstances.id, c.req.param("id")));
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    return c.json(rows[0]);
  },
);

// ── DELETE /:id ───────────────────────────────────────────────────────────────
adminPageSectionInstancesRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("page_sections", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const rows = await db
      .select()
      .from(pageSectionInstances)
      .where(eq(pageSectionInstances.id, c.req.param("id")));
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    await db
      .delete(pageSectionInstances)
      .where(eq(pageSectionInstances.id, c.req.param("id")));
    return c.json({ message: "Deleted" });
  },
);