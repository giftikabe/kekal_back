import { pgTable, text, boolean } from "drizzle-orm/pg-core";

export const componentLibrary = pgTable("component_library", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  tsxCode: text("tsx_code").notNull().default(""),
  cssCode: text("css_code").notNull().default(""),
  status: text("status").notNull().default("draft"),
  isCore: boolean("is_core").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});