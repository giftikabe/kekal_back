import { pgTable, text, boolean, index } from "drizzle-orm/pg-core";

/** Sitota giftable pieces are intentionally independent of collections. */
export const sitota = pgTable("sitota", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  mainImage: text("main_image").notNull(),
  gallery: text("gallery").array().notNull().default([]),
  colors: text("colors").array().notNull().default([]),
  sizes: text("sizes").array().notNull().default([]),
  occasion: text("occasion").notNull().default("Thoughtful gifting"),
  giftNote: text("gift_note").notNull().default(""),
  inStock: boolean("in_stock").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
}, (table) => ({ featuredIdx: index("sitota_featured_idx").on(table.featured), stockIdx: index("sitota_in_stock_idx").on(table.inStock) }));
