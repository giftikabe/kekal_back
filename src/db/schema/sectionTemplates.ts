import { pgTable, text, boolean } from "drizzle-orm/pg-core";

/**
 * A reusable section template. The admin pastes TSX + CSS code here.
 * The code is pushed to GitHub and can be placed on any page.
 *
 * field_schema: JSON array describing the placeholder fields this
 * component accepts, e.g.:
 *   [{ "name": "heading", "type": "text" },
 *    { "name": "image",   "type": "image" },
 *    { "name": "items",   "type": "list" }]
 *
 * data_source: optional — if set, the section pulls live data from
 * this DB table (e.g. "products", "events", "collections").
 */
export const sectionTemplates = pgTable("section_templates", {
  id:           text("id").primaryKey(),
  name:         text("name").notNull(),
  slug:         text("slug").notNull().unique(),
  description:  text("description"),
  tsx_code:     text("tsx_code"),
  css_code:     text("css_code"),
  // JSON: Array<{ name: string, type: "text"|"image"|"richtext"|"list" }>
  field_schema: text("field_schema").notNull().default("[]"),
  // e.g. "products" | "events" | "collections" | "upcomingEvents" | null
  data_source:  text("data_source"),
  // Whether this template's code has been pushed to GitHub
  published:    boolean("published").notNull().default(false),
  created_at:   text("created_at").notNull(),
});