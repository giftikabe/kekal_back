import { pgTable, text } from "drizzle-orm/pg-core";

export const pageSeo = pgTable("page_seo", {
  id: text("id").primaryKey(),
  route: text("route").notNull().unique(),
  metaTitle: text("meta_title").notNull(),
  metaDescription: text("meta_description").notNull(),
  keywords: text("keywords").array().notNull().default([]),
  socialImage: text("social_image"),
});
