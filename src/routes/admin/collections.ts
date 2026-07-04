import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { collections } from "../../db/schema/collections";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";
import { getPagination } from "../../lib/pagination";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminCollectionsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminCollectionsRouter.get("/", authMiddleware, requirePermission("collections", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { limit, offset } = getPagination(c);
  return c.json(await db.select().from(collections).limit(limit).offset(offset));
});

adminCollectionsRouter.get("/:id", authMiddleware, requirePermission("collections", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(collections).where(eq(collections.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminCollectionsRouter.post("/", authMiddleware, requirePermission("collections", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.collections);
  const newRecord = { id: crypto.randomUUID(), ...data } as typeof collections.$inferInsert;
  await db.insert(collections).values(newRecord);
  return c.json(newRecord, 201);
});

adminCollectionsRouter.patch("/:id", authMiddleware, requirePermission("collections", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.collections);
  await db.update(collections).set(data).where(eq(collections.id, c.req.param("id")));
  const result = await db.select().from(collections).where(eq(collections.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminCollectionsRouter.delete("/:id", authMiddleware, requirePermission("collections", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(collections).where(eq(collections.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(collections).where(eq(collections.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});
