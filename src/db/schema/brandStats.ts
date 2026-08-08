import { pgTable, text, integer, index } from "drizzle-orm/pg-core";

export const brandStats = pgTable("brand_stats", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  orderIdx: index("brand_stats_order_idx").on(table.order),
}));