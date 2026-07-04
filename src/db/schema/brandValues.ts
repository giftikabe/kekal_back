import { pgTable, text } from "drizzle-orm/pg-core";

export const brandValues = pgTable("brand_values", {
  id: text("id").primaryKey(),
  icon: text("icon").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
});
