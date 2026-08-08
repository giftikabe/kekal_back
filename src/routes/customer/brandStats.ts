import { Hono } from "hono";
import { asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { brandStats } from "../../db/schema/brandStats";

type Bindings = { DATABASE_URL: string };

export const brandStatsRouter = new Hono<{ Bindings: Bindings }>();

brandStatsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandStats).orderBy(asc(brandStats.order));
  c.header("Cache-Control", "public, max-age=60");
  return c.json(result);
});