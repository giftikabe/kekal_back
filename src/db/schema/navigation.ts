import { pgTable, text, integer, index } from "drizzle-orm/pg-core";

export const navigation = pgTable(
  "navigation",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    order: integer("order").notNull().default(0),
  },
  (table) => ({
    orderIdx: index("navigation_order_idx").on(table.order),
  }),
);
