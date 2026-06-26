import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pageSeo } from "../../db/schema/pageSeo";
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

export const adminPageSeoRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

adminPageSeoRouter.get(
  "/",
  authMiddleware,
  requirePermission("page_seo", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    return c.json(await db.select().from(pageSeo));
  },
);

adminPageSeoRouter.get(
  "/:id",
  authMiddleware,
  requirePermission("page_seo", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(pageSeo)
      .where(eq(pageSeo.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminPageSeoRouter.post(
  "/",
  authMiddleware,
  requirePermission("page_seo", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const newRecord = { id: crypto.randomUUID(), ...body };
    await db.insert(pageSeo).values(newRecord);
    return c.json(newRecord, 201);
  },
);

adminPageSeoRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("page_seo", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    await db
      .update(pageSeo)
      .set(body)
      .where(eq(pageSeo.id, c.req.param("id")));
    const result = await db
      .select()
      .from(pageSeo)
      .where(eq(pageSeo.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminPageSeoRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("page_seo", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(pageSeo)
      .where(eq(pageSeo.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    await db.delete(pageSeo).where(eq(pageSeo.id, c.req.param("id")));
    return c.json({ message: "Deleted successfully" });
  },
);
