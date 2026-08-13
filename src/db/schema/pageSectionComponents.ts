import { pgTable, text, integer, real, jsonb } from "drizzle-orm/pg-core";

import { pageSections } from "./pageSections";
import { componentLibrary } from "./componentLibrary";

/**
 * A section is built from one or more of these — each is one placed
 * instance of a library component, free-form positioned on the section's
 * canvas (x/y/width/height are percentages of the canvas, 0-100, so layout
 * survives the canvas being resized/previewed at different widths).
 *
 * dataBindings resolves a specific prop to a specific real record's field,
 * e.g. { "image": { source: "products", recordId: "prod_123", field: "mainImage" } }.
 * It is resolved to a literal value at publish time (see lib/codegen.ts) —
 * the generated page component never re-fetches at runtime for this data,
 * it's baked in, same as the existing componentConfig approach.
 */
export const pageSectionComponents = pgTable("page_section_components", {
  id: text("id").primaryKey(),
  sectionId: text("section_id")
    .notNull()
    .references(() => pageSections.id, { onDelete: "cascade" }),
  componentId: text("component_id")
    .notNull()
    .references(() => componentLibrary.id),

  x: real("x").notNull().default(5), // % of canvas width
  y: real("y").notNull().default(5), // % of canvas height
  width: real("width").notNull().default(30), // % of canvas width
  height: real("height").notNull().default(30), // % of canvas height
  zIndex: integer("z_index").notNull().default(0),

  propsOverride: jsonb("props_override").notNull().default({}), // literal static values, keyed by prop name
  dataBindings: jsonb("data_bindings").notNull().default({}), // keyed by prop name, see above

  createdAt: text("created_at").notNull(),
});
