import { pgTable, text } from "drizzle-orm/pg-core";

export const brandMessage = pgTable("brand_message", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
});
