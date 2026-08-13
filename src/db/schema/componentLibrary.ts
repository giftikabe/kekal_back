import { pgTable, text, boolean, jsonb } from "drizzle-orm/pg-core";

/**
 * BREAKING CHANGE from the previous schema: `tsx_code` and `css_code` are
 * gone. Code is no longer stored in Postgres — it lives only in the
 * kekal_frontend GitHub repo. `githubPath` / `cssGithubPath` point at the
 * committed files; `status` is "draft" until the first successful publish.
 *
 * `propSchema` describes the component's public props so the Component
 * Library and Page Builder can render a live preview with placeholders and
 * offer a data-binding dropdown, without needing to parse the TSX.
 *
 * propSchema shape (stored as JSON, not enforced by Postgres):
 *   Array<{
 *     name: string;            // must match the prop name in the TSX interface
 *     label: string;           // shown in the builder UI
 *     type: "text" | "richtext" | "image" | "video" | "url" | "number" | "boolean";
 *     bindable: boolean;       // can be wired to real data in Page Builder
 *     placeholder: unknown;    // default value used for preview / new instances
 *   }>
 *
 * MIGRATION NOTE: if you have existing rows with real tsx_code/css_code,
 * commit that code to GitHub FIRST (one-time backfill script) before
 * dropping these columns, or you'll lose it. See
 * src/scripts/backfillComponentCodeToGithub.ts.
 */
export const componentLibrary = pgTable("component_library", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // PascalCase; must match the .tsx filename in the repo
  displayName: text("display_name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  githubPath: text("github_path"), // e.g. "src/kekal/components/HeroBanner.tsx" — null until first publish
  cssGithubPath: text("css_github_path"), // e.g. "src/kekal/components/HeroBanner.module.css"
  propSchema: jsonb("prop_schema").notNull().default([]),
  status: text("status").notNull().default("draft"), // draft | published
  isCore: boolean("is_core").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
