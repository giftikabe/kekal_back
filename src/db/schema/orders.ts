import { pgTable, text, integer, index } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  shippingAddress: text("shipping_address").notNull(), // JSON string
  items: text("items").notNull(), // JSON string
  subtotal: integer("subtotal").notNull().default(0),
  total: integer("total").notNull().default(0),
  currency: text("currency").notNull().default("ETB"),
  status: text("status").notNull().default("pending"),
  chapaTxRef: text("chapa_tx_ref").unique(),
  chapaPaymentUrl: text("chapa_payment_url"),
  paymentVerifiedAt: text("payment_verified_at"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  statusIdx: index("orders_status_idx").on(table.status),
  customerEmailIdx: index("orders_customer_email_idx").on(table.customerEmail),
  chapaTxRefIdx: index("orders_chapa_tx_ref_idx").on(table.chapaTxRef),
}));