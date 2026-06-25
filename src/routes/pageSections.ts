import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "../db/index";
import { pageSections } from "../db/schema/pageSections";

type Bindings = { DATABASE_URL: string };

export const pageSectionsRouter = new Hono<{ Bindings: Bindings }>();

pageSectionsRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(pageSections);
  return c.json(result);
});

pageSectionsRouter.get("/:pageId", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const pageId = c.req.param("pageId");
  const result = await db.select().from(pageSections).where(eq(pageSections.pageId, pageId));
  return c.json(result);
});

pageSectionsRouter.get("/:pageId/:sectionName", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { pageId, sectionName } = c.req.param();
  const result = await db.select().from(pageSections).where(
    and(eq(pageSections.pageId, pageId), eq(pageSections.sectionName, sectionName))
  );
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});