import { Hono } from "hono";
import { eq, ne } from "drizzle-orm";
import { createDb } from "../../db/index";
import { events } from "../../db/schema/events";

type Bindings = { DATABASE_URL: string };

export const eventsRouter = new Hono<{ Bindings: Bindings }>();

eventsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(events);
  return c.json(result);
});

eventsRouter.get("/featured", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(events).where(eq(events.featured, true));
  return c.json(result);
});

eventsRouter.get("/past", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(events).where(eq(events.type, "event"));
  return c.json(result);
});

eventsRouter.get("/community-impact", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(events).where(eq(events.type, "community-impact"));
  return c.json(result);
});

eventsRouter.get("/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await db.select().from(events).where(eq(events.slug, slug));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

eventsRouter.get("/:slug/related", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await db.select().from(events).where(ne(events.slug, slug)).limit(3);
  return c.json(result);
});