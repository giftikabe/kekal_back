import { pgTable, text, integer, boolean, index } from "drizzle-orm/pg-core";

import { pages } from "./pages";

export const pageSections = pgTable(
  "page_sections",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    sectionName: text("section_name"),
    sectionHeader: text("section_header"),
    buttonLabels: text("button_labels").array().notNull().default([]),
    componentId: text("component_id"),
    componentConfig: text("component_config"),
    layoutOrder: integer("layout_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    templateName: text("template_name"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    pageIdIdx: index("page_sections_page_id_idx").on(table.pageId),
  }),
);