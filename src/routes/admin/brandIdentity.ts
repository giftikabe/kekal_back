import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { brandIdentity } from "../../db/schema/brandIdentity";
import { authMiddleware, requirePermission } from "../../middleware/auth";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminBrandIdentityRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminBrandIdentityRouter.get("/", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandIdentity);
  return c.json(result);
});

adminBrandIdentityRouter.get("/:id", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandIdentity).where(eq(brandIdentity.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminBrandIdentityRouter.post("/", authMiddleware, requirePermission("brand", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const newRecord = { id: crypto.randomUUID(), ...body };
  await db.insert(brandIdentity).values(newRecord);
  return c.json(newRecord, 201);
});

adminBrandIdentityRouter.patch("/:id", authMiddleware, requirePermission("brand", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  await db.update(brandIdentity).set(body).where(eq(brandIdentity.id, c.req.param("id")));
  const result = await db.select().from(brandIdentity).where(eq(brandIdentity.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminBrandIdentityRouter.delete("/:id", authMiddleware, requirePermission("brand", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandIdentity).where(eq(brandIdentity.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(brandIdentity).where(eq(brandIdentity.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});