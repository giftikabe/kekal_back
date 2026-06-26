import { Hono } from "hono";
import { eq, ne } from "drizzle-orm";
import { createDb } from "../../db/index";
import { upcomingEvents } from "../../db/schema/upcomingEvents";

type Bindings = { DATABASE_URL: string };

export const upcomingEventsRouter = new Hono<{ Bindings: Bindings }>();

upcomingEventsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(upcomingEvents);
  return c.json(result);
});

upcomingEventsRouter.get("/featured", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(upcomingEvents).where(eq(upcomingEvents.featured, true));
  return c.json(result);
});

upcomingEventsRouter.get("/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await db.select().from(upcomingEvents).where(eq(upcomingEvents.slug, slug));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

upcomingEventsRouter.get("/:slug/related", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await db.select().from(upcomingEvents).where(ne(upcomingEvents.slug, slug)).limit(3);
  return c.json(result);
});