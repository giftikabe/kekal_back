import { pgTable, text } from "drizzle-orm/pg-core";

export const eventCategories = pgTable("event_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});
