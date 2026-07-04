import { pgTable, text, index } from "drizzle-orm/pg-core";

import { pages } from "./pages";

export const pageSections = pgTable(
  "page_sections",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    sectionName: text("section_name").notNull(),
    sectionHeader: text("section_header").notNull(),
    buttonLabels: text("button_labels").array().notNull().default([]),
  },
  (table) => ({
    pageIdIdx: index("page_sections_page_id_idx").on(table.pageId),
  }),
);
