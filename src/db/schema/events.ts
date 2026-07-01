import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { eventCategories } from "./eventCategories";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  intro: text("intro").notNull(),
  content: text("content").notNull(),
  featuredImage: text("featured_image").notNull(),
  gallery: text("gallery").array().notNull().default([]),
  videoUrl: text("video_url"),
  categoryId: text("category_id").notNull().references(() => eventCategories.id),
  type: text("type", {
    enum: ["event", "community-impact"],
  }).notNull(),
  eventDate: text("event_date").notNull(),
  location: text("location").notNull(),
  organizer: text("organizer").notNull(),
  featured: boolean("featured").notNull().default(false),
});
