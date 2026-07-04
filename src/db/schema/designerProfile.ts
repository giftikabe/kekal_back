import { pgTable, text } from "drizzle-orm/pg-core";

export const designerProfile = pgTable("designer_profile", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  value: text("value").notNull(),
});
