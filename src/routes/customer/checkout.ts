import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { createDb } from "../../db/index";
import { commerceSettings } from "../../db/schema/commerceSettings";
import { orders } from "../../db/schema/orders";
import { initializePayment, verifyPayment } from "../../lib/chapa";

type Bindings = { DATABASE_URL: string; SITE_URL: string; API_BASE: string };

export const checkoutRouter = new Hono<{ Bindings: Bindings }>();

async function getSettings(databaseUrl: string) {
  const db = createDb(databaseUrl);
  const result = await db.select().from(commerceSettings).where(eq(commerceSettings.id, "singleton"));
  return result[0] || null;
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

checkoutRouter.get("/status", async (c) => {
  const settings = await getSettings(c.env.DATABASE_URL);
  c.header("Cache-Control", "public, max-age=60");
  return c.json({
    is_active: settings?.isActive || false,
    currency: settings?.currency || "ETB",
  });
});

checkoutRouter.post("/initiate", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const settings = await getSettings(c.env.DATABASE_URL);

  if (!settings || !settings.isActive) {
    return c.json({ error: "Checkout is not currently available" }, 503);
  }

  const body = await c.req.json();
  const { items, customer_name, customer_email, customer_phone, shipping_address } = body;

  if (!items || !customer_name || !customer_email || !customer_phone || !shipping_address) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const tx_ref = `KKL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(orders);
  const order_number = `KKL-${new Date().getFullYear()}-${String(Number(count) + 1).padStart(4, "0")}`;

  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();

  await db.insert(orders).values({
    id: orderId,
    orderNumber: order_number,
    customerName: customer_name,
    customerEmail: customer_email,
    customerPhone: customer_phone,
    shippingAddress: JSON.stringify(shipping_address),
    items: JSON.stringify(items),
    subtotal: 0,
    total: 0,
    currency: settings.currency,
    status: "pending",
    notes: "",
    createdAt: now,
    updatedAt: now,
  });

  const nameParts = customer_name.trim().split(" ");

  let checkoutData;
  try {
    checkoutData = await initializePayment(settings.chapaSecretKey, {
      amount: 1, // minimum for Chapa — real pricing TBD
      currency: settings.currency,
      email: customer_email,
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(" ") || nameParts[0],
      tx_ref,
      callback_url: `${c.env.API_BASE || "https://kekal-back.kekal.workers.dev"}/checkout/webhook`,
      return_url: `${c.env.SITE_URL || "https://kekalstudio.com"}/checkout/success?tx_ref=${tx_ref}`,
      customization: { title: "KEKAL Studio", description: `Order ${order_number}` },
    });
  } catch (err) {
    return c.json({ error: "Failed to initialize payment" }, 500);
  }

  await db
    .update(orders)
    .set({
      chapaPaymentUrl: checkoutData.checkout_url,
      chapaTxRef: tx_ref,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, orderId));

  return c.json({ payment_url: checkoutData.checkout_url, tx_ref, order_number });
});

checkoutRouter.get("/verify/:txRef", async (c) => {
  const settings = await getSettings(c.env.DATABASE_URL);
  if (!settings) return c.json({ error: "Commerce not configured" }, 503);

  const txRef = c.req.param("txRef");
  const db = createDb(c.env.DATABASE_URL);

  let verifyResult;
  try {
    verifyResult = await verifyPayment(settings.chapaSecretKey, txRef);
  } catch (err) {
    return c.json({ error: "Verification failed" }, 500);
  }

  const result = await db.select().from(orders).where(eq(orders.chapaTxRef, txRef));
  const order = result[0];
  if (!order) return c.json({ error: "Order not found" }, 404);

  if (verifyResult.status === "success") {
    await db
      .update(orders)
      .set({
        status: "paid",
        paymentVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.chapaTxRef, txRef));
    return c.json({ verified: true, order_number: order.orderNumber, status: "paid" });
  }

  return c.json({ verified: false, order_number: order.orderNumber, status: order.status });
});

checkoutRouter.post("/webhook", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("Chapa-Signature") || "";

  const settings = await getSettings(c.env.DATABASE_URL);
  if (!settings || !settings.chapaWebhookSecret) {
    return c.json({ error: "Webhook not configured" }, 401);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(settings.chapaWebhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToBuffer(signature),
    new TextEncoder().encode(body)
  );

  if (!isValid) return c.json({ error: "Invalid signature" }, 401);

  const payload = JSON.parse(body);
  const db = createDb(c.env.DATABASE_URL);

  const result = await db.select().from(orders).where(eq(orders.chapaTxRef, payload.tx_ref));
  if (!result[0]) return c.json({ error: "Order not found" }, 404);

  const newStatus = payload.status === "success" ? "paid" : payload.status;

  await db
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date().toISOString() })
    .where(eq(orders.chapaTxRef, payload.tx_ref));

  return c.json({ received: true }, 200);
});

checkoutRouter.get("/order/:orderNumber", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, c.req.param("orderNumber")));

  if (!result[0]) return c.json({ error: "Not found" }, 404);

  const order = result[0];
  return c.json({
    order_number: order.orderNumber,
    status: order.status,
    customer_name: order.customerName,
    created_at: order.createdAt,
  });
});