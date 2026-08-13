import { pgTable, text } from "drizzle-orm/pg-core";

/**
 * Intentionally tiny: just the default placeholder image/video shown in
 * previews when a prop of type "image"/"video" has no real data bound yet.
 * Seeded with two rows: key = "default_image" and key = "default_video".
 * If you later want a real multi-asset media library this table is the
 * natural place to grow from, but for now it's exactly what was asked for.
 */
export const mediaPlaceholders = pgTable("media_placeholders", {
  key: text("key").primaryKey(), // "default_image" | "default_video"
  url: text("url").notNull(),
  label: text("label").notNull().default(""),
});
