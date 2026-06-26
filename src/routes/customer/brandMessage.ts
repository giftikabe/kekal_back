import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { brandMessage } from "../../db/schema/brandMessage";

type Bindings = { DATABASE_URL: string };

export const brandMessageRouter = new Hono<{ Bindings: Bindings }>();

brandMessageRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandMessage);
  return c.json(result);
});

brandMessageRouter.get("/:key", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const key = c.req.param("key");
  const result = await db.select().from(brandMessage).where(eq(brandMessage.key, key));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});