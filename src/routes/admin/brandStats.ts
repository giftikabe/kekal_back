import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { brandStats } from "../../db/schema/brandStats";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminBrandStatsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminBrandStatsRouter.get("/", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(brandStats).orderBy(asc(brandStats.order)));
});

adminBrandStatsRouter.post("/", authMiddleware, requirePermission("brand", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.brandStats);
  const newRecord = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() } as typeof brandStats.$inferInsert;
  await db.insert(brandStats).values(newRecord);
  return c.json(newRecord, 201);
});

adminBrandStatsRouter.patch("/:id", authMiddleware, requirePermission("brand", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.brandStats);
  await db.update(brandStats).set(data).where(eq(brandStats.id, c.req.param("id")));
  const result = await db.select().from(brandStats).where(eq(brandStats.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminBrandStatsRouter.delete("/:id", authMiddleware, requirePermission("brand", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandStats).where(eq(brandStats.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(brandStats).where(eq(brandStats.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});