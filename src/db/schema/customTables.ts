import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

export interface StoredColumnDef {
  name: string;
  label: string;
  // key of COLUMN_TYPES: text | longtext | richtext | image | link | number | boolean | date
  type: string;
  required: boolean;
}

export const customTables = pgTable("custom_tables", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
  columns: jsonb("columns").$type<StoredColumnDef[]>().notNull().default([]),
});