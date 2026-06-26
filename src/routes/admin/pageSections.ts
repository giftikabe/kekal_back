import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pageSections } from "../../db/schema/pageSections";
import { authMiddleware, requirePermission } from "../../middleware/auth";

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SUPER_ADMIN_EMAIL: string;
};
type Variables = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

export const adminPageSectionsRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

adminPageSectionsRouter.get(
  "/",
  authMiddleware,
  requirePermission("page_sections", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    return c.json(await db.select().from(pageSections));
  },
);

adminPageSectionsRouter.get(
  "/:id",
  authMiddleware,
  requirePermission("page_sections", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminPageSectionsRouter.post(
  "/",
  authMiddleware,
  requirePermission("page_sections", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const newRecord = { id: crypto.randomUUID(), ...body };
    await db.insert(pageSections).values(newRecord);
    return c.json(newRecord, 201);
  },
);

adminPageSectionsRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("page_sections", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    await db
      .update(pageSections)
      .set(body)
      .where(eq(pageSections.id, c.req.param("id")));
    const result = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminPageSectionsRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("page_sections", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    await db.delete(pageSections).where(eq(pageSections.id, c.req.param("id")));
    return c.json({ message: "Deleted successfully" });
  },
);
