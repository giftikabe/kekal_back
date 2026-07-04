import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { events } from "../../db/schema/events";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";
import { getPagination } from "../../lib/pagination";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminEventsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminEventsRouter.get("/", authMiddleware, requirePermission("events", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { limit, offset } = getPagination(c);
  return c.json(await db.select().from(events).limit(limit).offset(offset));
});

adminEventsRouter.get("/:id", authMiddleware, requirePermission("events", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(events).where(eq(events.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminEventsRouter.post("/", authMiddleware, requirePermission("events", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.events);
  const newRecord = { id: crypto.randomUUID(), ...data } as typeof events.$inferInsert;
  await db.insert(events).values(newRecord);
  return c.json(newRecord, 201);
});

adminEventsRouter.patch("/:id", authMiddleware, requirePermission("events", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.events);
  await db.update(events).set(data).where(eq(events.id, c.req.param("id")));
  const result = await db.select().from(events).where(eq(events.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminEventsRouter.delete("/:id", authMiddleware, requirePermission("events", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(events).where(eq(events.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(events).where(eq(events.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});
