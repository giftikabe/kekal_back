import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { brandIdentity } from "../../db/schema/brandIdentity";

type Bindings = { DATABASE_URL: string };

export const brandIdentityRouter = new Hono<{ Bindings: Bindings }>();

brandIdentityRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(brandIdentity);
  return c.json(result);
});

brandIdentityRouter.get("/:key", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const key = c.req.param("key");
  const result = await db.select().from(brandIdentity).where(eq(brandIdentity.key, key));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});