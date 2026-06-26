import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pages } from "../../db/schema/pages";
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

export const adminPagesRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

adminPagesRouter.get(
  "/",
  authMiddleware,
  requirePermission("pages", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    return c.json(await db.select().from(pages));
  },
);

adminPagesRouter.get(
  "/:id",
  authMiddleware,
  requirePermission("pages", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(pages)
      .where(eq(pages.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminPagesRouter.post(
  "/",
  authMiddleware,
  requirePermission("pages", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const newRecord = { id: crypto.randomUUID(), ...body };
    await db.insert(pages).values(newRecord);
    return c.json(newRecord, 201);
  },
);

adminPagesRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("pages", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    await db
      .update(pages)
      .set(body)
      .where(eq(pages.id, c.req.param("id")));
    const result = await db
      .select()
      .from(pages)
      .where(eq(pages.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminPagesRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("pages", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(pages)
      .where(eq(pages.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    await db.delete(pages).where(eq(pages.id, c.req.param("id")));
    return c.json({ message: "Deleted successfully" });
  },
);
