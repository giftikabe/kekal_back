import { Hono } from "hono";
import { eq, sql, ilike, or, and, desc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { commerceSettings } from "../../db/schema/commerceSettings";
import { orders } from "../../db/schema/orders";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";
import { getPagination } from "../../lib/pagination";
import { testCredentials } from "../../lib/chapa";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string; SITE_URL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminCommerceRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminCommerceRouter.get("/settings", authMiddleware, requirePermission("commerce", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(commerceSettings).where(eq(commerceSettings.id, "singleton"));

  if (!result[0]) {
    return c.json({
      chapa_public_key: "",
      chapa_secret_key: "",
      chapa_webhook_secret: "",
      is_active: false,
      currency: "ETB",
    });
  }

  const settings = result[0];
  const maskedSecret = settings.chapaSecretKey ? `${settings.chapaSecretKey.slice(0, 8)}...` : "";

  return c.json({
    chapa_public_key: settings.chapaPublicKey,
    chapa_secret_key: maskedSecret,
    chapa_webhook_secret: settings.chapaWebhookSecret,
    is_active: settings.isActive,
    currency: settings.currency,
  });
});

adminCommerceRouter.post("/settings", authMiddleware, requirePermission("commerce", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.commerceSettings) as {
    chapa_public_key: string;
    chapa_secret_key: string;
    chapa_webhook_secret: string;
  };

  const isValid = await testCredentials(data.chapa_secret_key);
  if (!isValid) {
    return c.json({ success: false, error: "Invalid Chapa credentials. Check your secret key." });
  }

  const now = new Date().toISOString();
  const updated = await db
    .update(commerceSettings)
    .set({
      chapaPublicKey: data.chapa_public_key,
      chapaSecretKey: data.chapa_secret_key,
      chapaWebhookSecret: data.chapa_webhook_secret,
      updatedAt: now,
    })
    .where(eq(commerceSettings.id, "singleton"))
    .returning();

  if (updated.length === 0) {
    await db.insert(commerceSettings).values({
      id: "singleton",
      chapaPublicKey: data.chapa_public_key,
      chapaSecretKey: data.chapa_secret_key,
      chapaWebhookSecret: data.chapa_webhook_secret,
      isActive: false,
      currency: "ETB",
      createdAt: now,
      updatedAt: now,
    });
  }

  return c.json({ success: true });
});

adminCommerceRouter.patch("/settings/activate", authMiddleware, requirePermission("commerce", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  await db
    .update(commerceSettings)
    .set({ isActive: true, updatedAt: new Date().toISOString() })
    .where(eq(commerceSettings.id, "singleton"));
  return c.json({ success: true });
});

adminCommerceRouter.patch("/settings/deactivate", authMiddleware, requirePermission("commerce", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  await db
    .update(commerceSettings)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(commerceSettings.id, "singleton"));
  return c.json({ success: true });
});

adminCommerceRouter.get("/orders", authMiddleware, requirePermission("commerce", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const search = c.req.query("search");

  const conditions = [];
  if (status) conditions.push(eq(orders.status, status));
  if (search) {
    conditions.push(
      or(ilike(orders.orderNumber, `%${search}%`), ilike(orders.customerEmail, `%${search}%`))
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json(result);
});

adminCommerceRouter.get("/orders/:id", authMiddleware, requirePermission("commerce", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(orders).where(eq(orders.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminCommerceRouter.patch("/orders/:id", authMiddleware, requirePermission("commerce", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.orders);

  await db
    .update(orders)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(orders.id, c.req.param("id")));

  const result = await db.select().from(orders).where(eq(orders.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

adminCommerceRouter.get("/stats", authMiddleware, requirePermission("commerce", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [totalOrdersRow] = await db.select({ count: sql<number>`count(*)` }).from(orders);

  const [totalRevenueRow] = await db
    .select({ sum: sql<number>`coalesce(sum(${orders.total}), 0)` })
    .from(orders)
    .where(sql`${orders.status} IN ('paid', 'delivered')`);

  const [pendingCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.status, "pending"));

  const [thisMonthRevenueRow] = await db
    .select({ sum: sql<number>`coalesce(sum(${orders.total}), 0)` })
    .from(orders)
    .where(sql`${orders.status} IN ('paid', 'delivered') AND ${orders.createdAt} LIKE ${yearMonth + "%"}`);

  const ordersByStatus = await db
    .select({ status: orders.status, count: sql<number>`count(*)` })
    .from(orders)
    .groupBy(orders.status);

  // Returns raw cents — frontend divides by 100 for display
  return c.json({
    total_orders: totalOrdersRow.count,
    total_revenue: totalRevenueRow.sum,
    pending_count: pendingCountRow.count,
    this_month_revenue: thisMonthRevenueRow.sum,
    orders_by_status: ordersByStatus,
  });
});