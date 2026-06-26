import { Hono } from "hono";
import { createDb } from "../../db/index";
import { brandValues } from "../../db/schema/brandValues";

type Bindings = { DATABASE_URL: string };

export const brandValuesRouter = new Hono<{ Bindings: Bindings }>();

brandValuesRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandValues);
  return c.json(result);
});