import { Hono } from "hono";
import { createDb } from "../../db/index";
import { pages } from "../../db/schema/pages";

type Bindings = { DATABASE_URL: string };

export const pagesRouter = new Hono<{ Bindings: Bindings }>();

pagesRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(pages);
  return c.json(result);
});