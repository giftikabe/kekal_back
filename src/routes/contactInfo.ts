import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/index";
import { contactInfo } from "../db/schema/contactInfo";

type Bindings = { DATABASE_URL: string };

export const contactInfoRouter = new Hono<{ Bindings: Bindings }>();

contactInfoRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(contactInfo);
  return c.json(result);
});

contactInfoRouter.get("/:key", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const key = c.req.param("key");
  const result = await db.select().from(contactInfo).where(eq(contactInfo.key, key));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});