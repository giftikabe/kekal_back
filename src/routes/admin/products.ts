import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { products } from "../../db/schema/products";
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

export const adminProductsRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

adminProductsRouter.get(
  "/",
  authMiddleware,
  requirePermission("products", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    return c.json(await db.select().from(products));
  },
);

adminProductsRouter.get(
  "/:id",
  authMiddleware,
  requirePermission("products", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminProductsRouter.post(
  "/",
  authMiddleware,
  requirePermission("products", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const newRecord = { id: crypto.randomUUID(), ...body };
    await db.insert(products).values(newRecord);
    return c.json(newRecord, 201);
  },
);

adminProductsRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("products", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    await db
      .update(products)
      .set(body)
      .where(eq(products.id, c.req.param("id")));
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminProductsRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("products", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    await db.delete(products).where(eq(products.id, c.req.param("id")));
    return c.json({ message: "Deleted successfully" });
  },
);
