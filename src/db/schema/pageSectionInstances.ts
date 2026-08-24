import { pgTable, text, integer, boolean, index } from "drizzle-orm/pg-core";
import { pages } from "./pages";
import { sectionTemplates } from "./sectionTemplates";

/**
 * One instance of a section template placed on a specific page.
 *
 * field_values: JSON object — the admin-filled placeholder values for
 * this instance, e.g. { "heading": "Welcome", "image": "https://..." }
 * These are used when the template's data_source is null (static content).
 *
 * data_source: overrides the template-level data_source if set.
 */
export const pageSectionInstances = pgTable(
  "page_section_instances",
  {
    id:           text("id").primaryKey(),
    page_id:      text("page_id")
                    .notNull()
                    .references(() => pages.id, { onDelete: "cascade" }),
    template_id:  text("template_id")
                    .notNull()
                    .references(() => sectionTemplates.id, { onDelete: "cascade" }),
    layout_order: integer("layout_order").notNull().default(0),
    // JSON: Record<string, string> — field name → value for this instance
    field_values: text("field_values").notNull().default("{}"),
    // Override the template's data_source for this instance
    data_source:  text("data_source"),
    is_visible:   boolean("is_visible").notNull().default(true),
    created_at:   text("created_at").notNull(),
  },
  (table) => ({
    pageIdIdx: index("psi_page_id_idx").on(table.page_id),
    templateIdIdx: index("psi_template_id_idx").on(table.template_id),
  }),
);