import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { products } from "../../db/schema/products";
import { getPagination } from "../../lib/pagination";

type Bindings = { DATABASE_URL: string };

export const productsRouter = new Hono<{ Bindings: Bindings }>();

productsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { limit, offset } = getPagination(c);
  const result = await db.select().from(products).limit(limit).offset(offset);
  c.header("Cache-Control", "public, max-age=30");
  return c.json(result);
});

productsRouter.get("/by-collection/:collectionId", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const collectionId = c.req.param("collectionId");
  const { limit, offset } = getPagination(c);
  const result = await db
    .select()
    .from(products)
    .where(eq(products.collectionId, collectionId))
    .limit(limit)
    .offset(offset);
  c.header("Cache-Control", "public, max-age=30");
  return c.json(result);
});

productsRouter.get("/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const slug = c.req.param("slug");
  const result = await db.select().from(products).where(eq(products.slug, slug));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  c.header("Cache-Control", "public, max-age=30");
  return c.json(result[0]);
});
