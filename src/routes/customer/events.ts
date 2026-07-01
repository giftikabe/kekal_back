import { Hono } from "hono";
import { eq, ne } from "drizzle-orm";
import { createDb } from "../../db/index";
import { events } from "../../db/schema/events";
import { eventCategories } from "../../db/schema/eventCategories";

type Bindings = { DATABASE_URL: string };

export const eventsRouter = new Hono<{ Bindings: Bindings }>();

function withCategory(db: ReturnType<typeof createDb>) {
  return db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      intro: events.intro,
      content: events.content,
      featuredImage: events.featuredImage,
      gallery: events.gallery,
      videoUrl: events.videoUrl,
      categoryId: events.categoryId,
      category: eventCategories.name,
      categorySlug: eventCategories.slug,
      type: events.type,
      eventDate: events.eventDate,
      location: events.location,
      organizer: events.organizer,
      featured: events.featured,
    })
    .from(events)
    .leftJoin(eventCategories, eq(events.categoryId, eventCategories.id));
}

eventsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await withCategory(db));
});

eventsRouter.get("/featured", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await withCategory(db).where(eq(events.featured, true));
  return c.json(result);
});

eventsRouter.get("/past", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await withCategory(db).where(eq(events.type, "event"));
  return c.json(result);
});

eventsRouter.get("/community-impact", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await withCategory(db).where(eq(events.type, "community-impact"));
  return c.json(result);
});

eventsRouter.get("/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await withCategory(db).where(eq(events.slug, slug));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

eventsRouter.get("/:slug/related", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await withCategory(db).where(ne(events.slug, slug)).limit(3);
  return c.json(result);
});