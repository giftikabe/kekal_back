import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { createDb } from "../db/index";
import { collections } from "../db/schema/collections";

type Bindings = { DATABASE_URL: string };

export const collectionsRouter = new Hono<{ Bindings: Bindings }>();

collectionsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(collections);
  return c.json(result);
});

collectionsRouter.get("/featured", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(collections).where(eq(collections.featured, true));
  return c.json(result);
});

collectionsRouter.get("/latest", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(collections).orderBy(desc(collections.createdAt));
  return c.json(result);
});

collectionsRouter.get("/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await db.select().from(collections).where(eq(collections.slug, slug));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

collectionsRouter.get("/by-id/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const id = c.req.param("id");
  const result = await db.select().from(collections).where(eq(collections.id, id));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});