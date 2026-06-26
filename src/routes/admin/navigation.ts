import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { navigation } from "../../db/schema/navigation";
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

export const adminNavigationRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

adminNavigationRouter.get(
  "/",
  authMiddleware,
  requirePermission("navigation", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    return c.json(
      await db.select().from(navigation).orderBy(asc(navigation.order)),
    );
  },
);

adminNavigationRouter.get(
  "/:id",
  authMiddleware,
  requirePermission("navigation", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(navigation)
      .where(eq(navigation.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminNavigationRouter.post(
  "/",
  authMiddleware,
  requirePermission("navigation", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const newRecord = { id: crypto.randomUUID(), ...body };
    await db.insert(navigation).values(newRecord);
    return c.json(newRecord, 201);
  },
);

adminNavigationRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("navigation", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    await db
      .update(navigation)
      .set(body)
      .where(eq(navigation.id, c.req.param("id")));
    const result = await db
      .select()
      .from(navigation)
      .where(eq(navigation.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminNavigationRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("navigation", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(navigation)
      .where(eq(navigation.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    await db.delete(navigation).where(eq(navigation.id, c.req.param("id")));
    return c.json({ message: "Deleted successfully" });
  },
);
