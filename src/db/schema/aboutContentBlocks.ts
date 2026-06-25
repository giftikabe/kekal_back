import { pgTable, text } from "drizzle-orm/pg-core";

export const aboutContentBlocks = pgTable("about_content_blocks", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  images: text("images").array().notNull().default([]),
});