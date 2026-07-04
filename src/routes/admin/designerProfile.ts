import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { designerProfile } from "../../db/schema/designerProfile";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminDesignerProfileRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminDesignerProfileRouter.get("/", authMiddleware, requirePermission("designer_profile", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(designerProfile));
});

adminDesignerProfileRouter.get("/:id", authMiddleware, requirePermission("designer_profile", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(designerProfile).where(eq(designerProfile.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminDesignerProfileRouter.post("/", authMiddleware, requirePermission("designer_profile", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.designerProfile);
  const newRecord = { id: crypto.randomUUID(), ...data } as typeof designerProfile.$inferInsert;
  await db.insert(designerProfile).values(newRecord);
  return c.json(newRecord, 201);
});

adminDesignerProfileRouter.patch("/:id", authMiddleware, requirePermission("designer_profile", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.designerProfile);
  await db.update(designerProfile).set(data).where(eq(designerProfile.id, c.req.param("id")));
  const result = await db.select().from(designerProfile).where(eq(designerProfile.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminDesignerProfileRouter.delete("/:id", authMiddleware, requirePermission("designer_profile", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(designerProfile).where(eq(designerProfile.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(designerProfile).where(eq(designerProfile.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});
