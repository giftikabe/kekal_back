import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pageSectionComponents } from "../../db/schema/pageSectionComponents";
import { componentLibrary } from "../../db/schema/componentLibrary";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminSectionComponentsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /admin/page-builder/sections/:sectionId/components
adminSectionComponentsRouter.get(
  "/sections/:sectionId/components",
  authMiddleware,
  requirePermission("pages", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { sectionId } = c.req.param();

    const instances = await db
      .select({
        id: pageSectionComponents.id,
        sectionId: pageSectionComponents.sectionId,
        componentId: pageSectionComponents.componentId,
        x: pageSectionComponents.x,
        y: pageSectionComponents.y,
        width: pageSectionComponents.width,
        height: pageSectionComponents.height,
        zIndex: pageSectionComponents.zIndex,
        propsOverride: pageSectionComponents.propsOverride,
        dataBindings: pageSectionComponents.dataBindings,
        createdAt: pageSectionComponents.createdAt,
        componentName: componentLibrary.name,
        componentDisplayName: componentLibrary.displayName,
        propSchema: componentLibrary.propSchema,
        componentStatus: componentLibrary.status,
      })
      .from(pageSectionComponents)
      .leftJoin(componentLibrary, eq(pageSectionComponents.componentId, componentLibrary.id))
      .where(eq(pageSectionComponents.sectionId, sectionId));

    return c.json(instances);
  }
);

// POST /admin/page-builder/sections/:sectionId/components — place a component on the canvas
adminSectionComponentsRouter.post(
  "/sections/:sectionId/components",
  authMiddleware,
  requirePermission("pages", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { sectionId } = c.req.param();
    const body = await c.req.json();

    // Only published components (i.e. ones that actually exist as files in
    // the frontend repo) can be placed — a draft has no real component to
    // render on the live site.
    const comp = await db.select().from(componentLibrary).where(eq(componentLibrary.id, body.componentId));
    if (!comp[0]) return c.json({ error: "Component not found" }, 404);
    if (comp[0].status !== "published") {
      return c.json({ error: "Only published components can be added to a page. Publish it from the Component Library first." }, 400);
    }

    const data = pickFields(body, ALLOWED_FIELDS.sectionComponents);
    const newRecord = {
      id: crypto.randomUUID(),
      sectionId,
      componentId: body.componentId,
      x: data.x ?? 5,
      y: data.y ?? 5,
      width: data.width ?? 30,
      height: data.height ?? 30,
      zIndex: data.zIndex ?? 0,
      propsOverride: data.propsOverride ?? {},
      dataBindings: data.dataBindings ?? {},
      createdAt: new Date().toISOString(),
    } as typeof pageSectionComponents.$inferInsert;

    await db.insert(pageSectionComponents).values(newRecord);
    return c.json(newRecord, 201);
  }
);

// PATCH /admin/page-builder/section-components/:id — move/resize/restyle/rebind
adminSectionComponentsRouter.patch(
  "/section-components/:id",
  authMiddleware,
  requirePermission("pages", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const data = pickFields(body, ALLOWED_FIELDS.sectionComponents);

    await db.update(pageSectionComponents).set(data).where(eq(pageSectionComponents.id, c.req.param("id")));

    const result = await db
      .select()
      .from(pageSectionComponents)
      .where(eq(pageSectionComponents.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  }
);

// DELETE /admin/page-builder/section-components/:id
adminSectionComponentsRouter.delete(
  "/section-components/:id",
  authMiddleware,
  requirePermission("pages", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(pageSectionComponents)
      .where(eq(pageSectionComponents.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    await db.delete(pageSectionComponents).where(eq(pageSectionComponents.id, c.req.param("id")));
    return c.json({ message: "Deleted successfully" });
  }
);
