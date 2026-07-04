import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { designerProfile } from "../../db/schema/designerProfile";

type Bindings = { DATABASE_URL: string };

export const designerProfileRouter = new Hono<{ Bindings: Bindings }>();

designerProfileRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(designerProfile);
  c.header("Cache-Control", "public, max-age=60");
  return c.json(result);
});

designerProfileRouter.get("/:key", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const key = c.req.param("key");
  const result = await db.select().from(designerProfile).where(eq(designerProfile.key, key));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  c.header("Cache-Control", "public, max-age=60");
  return c.json(result[0]);
});
