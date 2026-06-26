import { Hono } from "hono";
import { createDb } from "../../db/index";
import { aboutContentBlocks } from "../../db/schema/aboutContentBlocks";

type Bindings = { DATABASE_URL: string };

export const aboutContentBlocksRouter = new Hono<{ Bindings: Bindings }>();

aboutContentBlocksRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(aboutContentBlocks);
  return c.json(result);
});