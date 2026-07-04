import { Hono } from "hono";
import { eq, ne } from "drizzle-orm";
import { createDb } from "../../db/index";
import { upcomingEvents } from "../../db/schema/upcomingEvents";
import { eventCategories } from "../../db/schema/eventCategories";
import { getPagination } from "../../lib/pagination";

type Bindings = { DATABASE_URL: string };

export const upcomingEventsRouter = new Hono<{ Bindings: Bindings }>();

function withCategory(db: ReturnType<typeof createDb>) {
  return db
    .select({
      id: upcomingEvents.id,
      title: upcomingEvents.title,
      slug: upcomingEvents.slug,
      intro: upcomingEvents.intro,
      content: upcomingEvents.content,
      featuredImage: upcomingEvents.featuredImage,
      categoryId: upcomingEvents.categoryId,
      category: eventCategories.name,
      categorySlug: eventCategories.slug,
      eventDate: upcomingEvents.eventDate,
      location: upcomingEvents.location,
      organizer: upcomingEvents.organizer,
      registrationUrl: upcomingEvents.registrationUrl,
      ctaText: upcomingEvents.ctaText,
      featured: upcomingEvents.featured,
    })
    .from(upcomingEvents)
    .leftJoin(eventCategories, eq(upcomingEvents.categoryId, eventCategories.id));
}

upcomingEventsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { limit, offset } = getPagination(c);
  const result = await withCategory(db).limit(limit).offset(offset);
  c.header("Cache-Control", "public, max-age=30");
  return c.json(result);
});

upcomingEventsRouter.get("/featured", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await withCategory(db).where(eq(upcomingEvents.featured, true));
  c.header("Cache-Control", "public, max-age=30");
  return c.json(result);
});

upcomingEventsRouter.get("/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await withCategory(db).where(eq(upcomingEvents.slug, slug));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  c.header("Cache-Control", "public, max-age=30");
  return c.json(result[0]);
});

upcomingEventsRouter.get("/:slug/related", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await withCategory(db).where(ne(upcomingEvents.slug, slug)).limit(3);
  c.header("Cache-Control", "public, max-age=30");
  return c.json(result);
});
