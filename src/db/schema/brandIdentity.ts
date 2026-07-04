import { pgTable, text } from "drizzle-orm/pg-core";

export const brandIdentity = pgTable("brand_identity", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  value: text("value").notNull(),
});
