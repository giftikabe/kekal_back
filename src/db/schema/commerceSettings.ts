import { pgTable, text, boolean } from "drizzle-orm/pg-core";

// In production, move chapa_secret_key to wrangler secret put CHAPA_SECRET_KEY
export const commerceSettings = pgTable("commerce_settings", {
  id: text("id").primaryKey(),
  chapaPublicKey: text("chapa_public_key").notNull().default(""),
  chapaSecretKey: text("chapa_secret_key").notNull().default(""),
  chapaWebhookSecret: text("chapa_webhook_secret").notNull().default(""),
  isActive: boolean("is_active").notNull().default(false),
  currency: text("currency").notNull().default("ETB"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});