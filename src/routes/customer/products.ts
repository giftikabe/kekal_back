import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { products } from "../../db/schema/products";

type Bindings = { DATABASE_URL: string };

export const productsRouter = new Hono<{ Bindings: Bindings }>();

productsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(products);
  return c.json(result);
});

productsRouter.get("/by-collection/:collectionId", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const collectionId = c.req.param("collectionId");
  const result = await db.select().from(products).where(eq(products.collectionId, collectionId));
  return c.json(result);
});

productsRouter.get("/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await db.select().from(products).where(eq(products.slug, slug));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});