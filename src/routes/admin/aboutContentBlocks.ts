import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { aboutContentBlocks } from "../../db/schema/aboutContentBlocks";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminAboutContentBlocksRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminAboutContentBlocksRouter.get("/", authMiddleware, requirePermission("about_content_blocks", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(aboutContentBlocks));
});

adminAboutContentBlocksRouter.get("/:id", authMiddleware, requirePermission("about_content_blocks", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(aboutContentBlocks).where(eq(aboutContentBlocks.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminAboutContentBlocksRouter.post("/", authMiddleware, requirePermission("about_content_blocks", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.aboutContentBlocks);
  const newRecord = { id: crypto.randomUUID(), ...data } as typeof aboutContentBlocks.$inferInsert;
  await db.insert(aboutContentBlocks).values(newRecord);
  return c.json(newRecord, 201);
});

adminAboutContentBlocksRouter.patch("/:id", authMiddleware, requirePermission("about_content_blocks", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.aboutContentBlocks);
  await db.update(aboutContentBlocks).set(data).where(eq(aboutContentBlocks.id, c.req.param("id")));
  const result = await db.select().from(aboutContentBlocks).where(eq(aboutContentBlocks.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminAboutContentBlocksRouter.delete("/:id", authMiddleware, requirePermission("about_content_blocks", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(aboutContentBlocks).where(eq(aboutContentBlocks.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(aboutContentBlocks).where(eq(aboutContentBlocks.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});
