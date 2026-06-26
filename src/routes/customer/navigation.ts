import { Hono } from "hono";
import { asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { navigation } from "../../db/schema/navigation";

type Bindings = { DATABASE_URL: string };

export const navigationRouter = new Hono<{ Bindings: Bindings }>();

navigationRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(navigation).orderBy(asc(navigation.order));
  return c.json(result);
});