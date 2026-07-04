import { pgTable, text, integer, boolean, index } from "drizzle-orm/pg-core";

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    coverImage: text("cover_image").notNull(),
    releaseYear: integer("release_year").notNull(),
    createdAt: text("created_at").notNull(),
    status: text("status", { enum: ["current", "archive"] }).notNull(),
    inStock: boolean("in_stock").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
  },
  (table) => ({
    featuredIdx: index("collections_featured_idx").on(table.featured),
    createdAtIdx: index("collections_created_at_idx").on(table.createdAt),
  }),
);
