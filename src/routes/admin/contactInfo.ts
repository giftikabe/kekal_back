import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { contactInfo } from "../../db/schema/contactInfo";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminContactInfoRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminContactInfoRouter.get("/", authMiddleware, requirePermission("contact_info", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(contactInfo));
});

adminContactInfoRouter.get("/:id", authMiddleware, requirePermission("contact_info", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(contactInfo).where(eq(contactInfo.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminContactInfoRouter.post("/", authMiddleware, requirePermission("contact_info", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.contactInfo);
  const newRecord = { id: crypto.randomUUID(), ...data } as typeof contactInfo.$inferInsert;
  await db.insert(contactInfo).values(newRecord);
  return c.json(newRecord, 201);
});

adminContactInfoRouter.patch("/:id", authMiddleware, requirePermission("contact_info", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.contactInfo);
  await db.update(contactInfo).set(data).where(eq(contactInfo.id, c.req.param("id")));
  const result = await db.select().from(contactInfo).where(eq(contactInfo.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminContactInfoRouter.delete("/:id", authMiddleware, requirePermission("contact_info", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(contactInfo).where(eq(contactInfo.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(contactInfo).where(eq(contactInfo.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});
