import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { brandValues } from "../../db/schema/brandValues";
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

export const adminBrandValuesRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

adminBrandValuesRouter.get(
  "/",
  authMiddleware,
  requirePermission("brand", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    return c.json(await db.select().from(brandValues));
  },
);

adminBrandValuesRouter.get(
  "/:id",
  authMiddleware,
  requirePermission("brand", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(brandValues)
      .where(eq(brandValues.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminBrandValuesRouter.post(
  "/",
  authMiddleware,
  requirePermission("brand", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const newRecord = { id: crypto.randomUUID(), ...body };
    await db.insert(brandValues).values(newRecord);
    return c.json(newRecord, 201);
  },
);

adminBrandValuesRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("brand", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    await db
      .update(brandValues)
      .set(body)
      .where(eq(brandValues.id, c.req.param("id")));
    const result = await db
      .select()
      .from(brandValues)
      .where(eq(brandValues.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminBrandValuesRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("brand", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(brandValues)
      .where(eq(brandValues.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    await db.delete(brandValues).where(eq(brandValues.id, c.req.param("id")));
    return c.json({ message: "Deleted successfully" });
  },
);
