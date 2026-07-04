import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { eventCategories } from "../../db/schema/eventCategories";
import { authMiddleware, requirePermission } from "../../middleware/auth";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminEventCategoriesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminEventCategoriesRouter.get("/", authMiddleware, requirePermission("events", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(eventCategories));
});

adminEventCategoriesRouter.post("/", authMiddleware, requirePermission("events", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();

  if (!body?.name || typeof body.name !== "string") {
    return c.json({ error: "name is required" }, 400);
  }

  const slug: string =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug
      : body.name.toLowerCase().trim().replace(/\s+/g, "-");

  const newRecord = { id: crypto.randomUUID(), name: body.name, slug };
  await db.insert(eventCategories).values(newRecord);
  return c.json(newRecord, 201);
});

adminEventCategoriesRouter.delete("/:id", authMiddleware, requirePermission("events", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const id = c.req.param("id");
  const result = await db.select().from(eventCategories).where(eq(eventCategories.id, id));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  // Categories are referenced by events/upcomingEvents via FK without cascade —
  // deletion will fail at the DB level if in use (caught by the global error
  // handler and returned as a 409), which is the desired safety behavior.
  await db.delete(eventCategories).where(eq(eventCategories.id, id));
  return c.json({ message: "Deleted successfully" });
});
