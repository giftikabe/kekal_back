import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pages } from "../../db/schema/pages";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminPagesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminPagesRouter.get("/", authMiddleware, requirePermission("pages", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(pages));
});

adminPagesRouter.get("/:id", authMiddleware, requirePermission("pages", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(pages).where(eq(pages.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminPagesRouter.post("/", authMiddleware, requirePermission("pages", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.pages);
  const newRecord = { id: crypto.randomUUID(), ...data } as typeof pages.$inferInsert;
  await db.insert(pages).values(newRecord);
  return c.json(newRecord, 201);
});

adminPagesRouter.patch("/:id", authMiddleware, requirePermission("pages", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.pages);
  await db.update(pages).set(data).where(eq(pages.id, c.req.param("id")));
  const result = await db.select().from(pages).where(eq(pages.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminPagesRouter.delete("/:id", authMiddleware, requirePermission("pages", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(pages).where(eq(pages.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(pages).where(eq(pages.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});
