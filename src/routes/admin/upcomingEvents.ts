import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { upcomingEvents } from "../../db/schema/upcomingEvents";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";
import { getPagination } from "../../lib/pagination";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminUpcomingEventsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminUpcomingEventsRouter.get("/", authMiddleware, requirePermission("upcoming_events", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { limit, offset } = getPagination(c);
  return c.json(await db.select().from(upcomingEvents).limit(limit).offset(offset));
});

adminUpcomingEventsRouter.get("/:id", authMiddleware, requirePermission("upcoming_events", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(upcomingEvents).where(eq(upcomingEvents.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminUpcomingEventsRouter.post("/", authMiddleware, requirePermission("upcoming_events", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.upcomingEvents);
  const newRecord = { id: crypto.randomUUID(), ...data } as typeof upcomingEvents.$inferInsert;
  await db.insert(upcomingEvents).values(newRecord);
  return c.json(newRecord, 201);
});

adminUpcomingEventsRouter.patch("/:id", authMiddleware, requirePermission("upcoming_events", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.upcomingEvents);
  await db.update(upcomingEvents).set(data).where(eq(upcomingEvents.id, c.req.param("id")));
  const result = await db.select().from(upcomingEvents).where(eq(upcomingEvents.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminUpcomingEventsRouter.delete("/:id", authMiddleware, requirePermission("upcoming_events", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(upcomingEvents).where(eq(upcomingEvents.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(upcomingEvents).where(eq(upcomingEvents.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});
