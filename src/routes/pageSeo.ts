import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/index";
import { pageSeo } from "../db/schema/pageSeo";

type Bindings = { DATABASE_URL: string };

export const pageSeoRouter = new Hono<{ Bindings: Bindings }>();

pageSeoRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(pageSeo);
  return c.json(result);
});

pageSeoRouter.get("/by-route", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const route = c.req.query("route");
  if (!route) return c.json({ error: "route query param required" }, 400);
  const result = await db.select().from(pageSeo).where(eq(pageSeo.route, route));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});