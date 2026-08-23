import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pageSections } from "../../db/schema/pageSections";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminPageSectionsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET all sections
adminPageSectionsRouter.get("/", authMiddleware, requirePermission("page_sections", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(pageSections));
});

// GET sections for a specific page, ordered by layoutOrder
adminPageSectionsRouter.get("/by-page/:pageId", authMiddleware, requirePermission("page_sections", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const results = await db
    .select()
    .from(pageSections)
    .where(eq(pageSections.pageId, c.req.param("pageId")))
    .orderBy(asc(pageSections.layoutOrder));
  return c.json(results);
});

// GET all template sections (templateName is not null)
adminPageSectionsRouter.get("/templates", authMiddleware, requirePermission("page_sections", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const results = await db
    .select()
    .from(pageSections)
    .orderBy(asc(pageSections.templateName));
  // Filter to only those with a templateName set
  return c.json(results.filter((s) => s.templateName));
});

// GET single section
adminPageSectionsRouter.get("/:id", authMiddleware, requirePermission("page_sections", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(pageSections).where(eq(pageSections.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

// POST — create a section
adminPageSectionsRouter.post("/", authMiddleware, requirePermission("page_sections", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.pageSections);
  const newRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  } as typeof pageSections.$inferInsert;
  await db.insert(pageSections).values(newRecord);
  return c.json(newRecord, 201);
});

// POST /duplicate/:id — copy a section (template or regular) onto a page
adminPageSectionsRouter.post("/duplicate/:id", authMiddleware, requirePermission("page_sections", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json() as { pageId: string; layoutOrder?: number };

  const source = await db.select().from(pageSections).where(eq(pageSections.id, c.req.param("id")));
  if (!source[0]) return c.json({ error: "Source section not found" }, 404);

  const newSection = {
    ...source[0],
    id: crypto.randomUUID(),
    pageId: body.pageId,
    // When duplicating a template, the copy is NOT itself a template
    templateName: null,
    layoutOrder: body.layoutOrder ?? source[0].layoutOrder,
    createdAt: new Date().toISOString(),
  } as typeof pageSections.$inferInsert;

  await db.insert(pageSections).values(newSection);
  return c.json(newSection, 201);
});

// PATCH /reorder — bulk update layoutOrder for a page's sections
// Body: { updates: Array<{ id: string; layoutOrder: number }> }
adminPageSectionsRouter.patch("/reorder", authMiddleware, requirePermission("page_sections", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json() as { updates: Array<{ id: string; layoutOrder: number }> };

  await Promise.all(
    body.updates.map(({ id, layoutOrder }) =>
      db.update(pageSections).set({ layoutOrder }).where(eq(pageSections.id, id)),
    ),
  );

  return c.json({ ok: true });
});

// PATCH /:id — update a single section
adminPageSectionsRouter.patch("/:id", authMiddleware, requirePermission("page_sections", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.pageSections);
  await db.update(pageSections).set(data).where(eq(pageSections.id, c.req.param("id")));
  const result = await db.select().from(pageSections).where(eq(pageSections.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

// DELETE /:id
adminPageSectionsRouter.delete("/:id", authMiddleware, requirePermission("page_sections", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(pageSections).where(eq(pageSections.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(pageSections).where(eq(pageSections.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});