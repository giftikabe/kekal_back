import { Hono } from "hono";
import { createDb } from "../../db/index";
import { eventCategories } from "../../db/schema/eventCategories";

type Bindings = { DATABASE_URL: string };

export const eventCategoriesRouter = new Hono<{ Bindings: Bindings }>();

eventCategoriesRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(eventCategories);
  c.header("Cache-Control", "public, max-age=60");
  return c.json(result);
});
