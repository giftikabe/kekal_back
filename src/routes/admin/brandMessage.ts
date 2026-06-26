import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { brandMessage } from "../../db/schema/brandMessage";
import { authMiddleware, requirePermission } from "../../middleware/auth";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminBrandMessageRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminBrandMessageRouter.get("/", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(brandMessage));
});

adminBrandMessageRouter.get("/:id", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandMessage).where(eq(brandMessage.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminBrandMessageRouter.post("/", authMiddleware, requirePermission("brand", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const newRecord = { id: crypto.randomUUID(), ...body };
  await db.insert(brandMessage).values(newRecord);
  return c.json(newRecord, 201);
});

adminBrandMessageRouter.patch("/:id", authMiddleware, requirePermission("brand", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  await db.update(brandMessage).set(body).where(eq(brandMessage.id, c.req.param("id")));
  const result = await db.select().from(brandMessage).where(eq(brandMessage.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminBrandMessageRouter.delete("/:id", authMiddleware, requirePermission("brand", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandMessage).where(eq(brandMessage.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(brandMessage).where(eq(brandMessage.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});