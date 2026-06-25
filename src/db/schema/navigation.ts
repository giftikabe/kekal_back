import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const navigation = pgTable("navigation", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  href: text("href").notNull(),
  order: integer("order").notNull().default(0),
});