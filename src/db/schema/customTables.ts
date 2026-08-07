import { pgTable, text } from "drizzle-orm/pg-core";

export const customTables = pgTable("custom_tables", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
});