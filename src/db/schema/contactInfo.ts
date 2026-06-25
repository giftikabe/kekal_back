import { pgTable, text } from "drizzle-orm/pg-core";

export const contactInfo = pgTable("contact_info", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  value: text("value").notNull(),
});