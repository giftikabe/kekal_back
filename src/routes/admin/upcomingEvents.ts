import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { upcomingEvents } from "../../db/schema/upcomingEvents";
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

export const adminUpcomingEventsRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

adminUpcomingEventsRouter.get(
  "/",
  authMiddleware,
  requirePermission("upcoming_events", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    return c.json(await db.select().from(upcomingEvents));
  },
);

adminUpcomingEventsRouter.get(
  "/:id",
  authMiddleware,
  requirePermission("upcoming_events", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(upcomingEvents)
      .where(eq(upcomingEvents.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminUpcomingEventsRouter.post(
  "/",
  authMiddleware,
  requirePermission("upcoming_events", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const newRecord = { id: crypto.randomUUID(), ...body };
    await db.insert(upcomingEvents).values(newRecord);
    return c.json(newRecord, 201);
  },
);

adminUpcomingEventsRouter.patch(
  "/:id",
  authMiddleware,
  requirePermission("upcoming_events", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    await db
      .update(upcomingEvents)
      .set(body)
      .where(eq(upcomingEvents.id, c.req.param("id")));
    const result = await db
      .select()
      .from(upcomingEvents)
      .where(eq(upcomingEvents.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  },
);

adminUpcomingEventsRouter.delete(
  "/:id",
  authMiddleware,
  requirePermission("upcoming_events", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const result = await db
      .select()
      .from(upcomingEvents)
      .where(eq(upcomingEvents.id, c.req.param("id")));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    await db
      .delete(upcomingEvents)
      .where(eq(upcomingEvents.id, c.req.param("id")));
    return c.json({ message: "Deleted successfully" });
  },
);
