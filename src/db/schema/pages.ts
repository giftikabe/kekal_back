import { pgTable, text } from "drizzle-orm/pg-core";

export const pages = pgTable("pages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  route: text("route").notNull().unique(),
});