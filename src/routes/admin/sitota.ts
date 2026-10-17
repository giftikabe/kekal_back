import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { sitota } from "../../db/schema/sitota";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";
import { getPagination } from "../../lib/pagination";
type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };
export const adminSitotaRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const permission = "products"; // Reuse existing product permissions to avoid a permission migration.
adminSitotaRouter.get("/", authMiddleware, requirePermission(permission,"read"), async c => { const db=createDb(c.env.DATABASE_URL); const {limit,offset}=getPagination(c); return c.json(await db.select().from(sitota).limit(limit).offset(offset)); });
adminSitotaRouter.get("/:id", authMiddleware, requirePermission(permission,"read"), async c => { const db=createDb(c.env.DATABASE_URL); const rows=await db.select().from(sitota).where(eq(sitota.id,c.req.param("id"))); if(!rows[0]) return c.json({error:"Not found"},404); return c.json(rows[0]); });
adminSitotaRouter.post("/", authMiddleware, requirePermission(permission,"create"), async c => { const db=createDb(c.env.DATABASE_URL); const body=await c.req.json(); const data=pickFields(body,ALLOWED_FIELDS.sitota); const row={ id:crypto.randomUUID(), ...data } as typeof sitota.$inferInsert; await db.insert(sitota).values(row); return c.json(row,201); });
adminSitotaRouter.patch("/:id", authMiddleware, requirePermission(permission,"update"), async c => { const db=createDb(c.env.DATABASE_URL); const data=pickFields(await c.req.json(),ALLOWED_FIELDS.sitota); await db.update(sitota).set(data).where(eq(sitota.id,c.req.param("id"))); const rows=await db.select().from(sitota).where(eq(sitota.id,c.req.param("id"))); if(!rows[0]) return c.json({error:"Not found"},404); return c.json(rows[0]); });
adminSitotaRouter.delete("/:id", authMiddleware, requirePermission(permission,"delete"), async c => { const db=createDb(c.env.DATABASE_URL); const rows=await db.select().from(sitota).where(eq(sitota.id,c.req.param("id"))); if(!rows[0]) return c.json({error:"Not found"},404); await db.delete(sitota).where(eq(sitota.id,c.req.param("id"))); return c.json({message:"Deleted successfully"}); });
