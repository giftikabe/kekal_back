import { pgTable, text, boolean, index } from "drizzle-orm/pg-core";

import { collections } from "./collections";

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    mainImage: text("main_image").notNull(),
    gallery: text("gallery").array().notNull().default([]),
    colors: text("colors").array().notNull().default([]),
    sizes: text("sizes").array().notNull().default([]),
    inStock: boolean("in_stock").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
  },
  (table) => ({
    collectionIdIdx: index("products_collection_id_idx").on(table.collectionId),
    featuredIdx: index("products_featured_idx").on(table.featured),
  }),
);
