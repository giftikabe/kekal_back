import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { eventCategories } from "./eventCategories";

export const upcomingEvents = pgTable("upcoming_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  intro: text("intro").notNull(),
  content: text("content").notNull(),
  featuredImage: text("featured_image").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => eventCategories.id),
  eventDate: text("event_date").notNull(),
  location: text("location").notNull(),
  organizer: text("organizer").notNull(),
  registrationUrl: text("registration_url"),
  ctaText: text("cta_text").notNull(),
  featured: boolean("featured").notNull().default(false),
});
