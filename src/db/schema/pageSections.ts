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
    // Legacy single-component reference. Kept for backward compatibility
    // with any section that was never migrated to the free-form canvas —
    // new sections built in the updated Page Builder leave this null and
    // use pageSectionComponents instead.
    componentId: text("component_id"),
    componentConfig: text("component_config"),
    layoutOrder: integer("layout_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    // NEW: reference canvas height (px) the free-form x/y/width/height
    // percentages in pageSectionComponents are relative to. Lets the
    // builder and the published page agree on aspect ratio.
    canvasHeight: integer("canvas_height").notNull().default(480),
    // templateName already existed and doubles as "isTemplate": any
    // section with a non-null templateName shows up in the Templates
    // list and can be dropped onto any other page.
    templateName: text("template_name"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    pageIdIdx: index("page_sections_page_id_idx").on(table.pageId),
  }),
);
