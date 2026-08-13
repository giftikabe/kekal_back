CREATE TABLE "media_placeholders" (
	"key" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"label" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_section_components" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"component_id" text NOT NULL,
	"x" real DEFAULT 5 NOT NULL,
	"y" real DEFAULT 5 NOT NULL,
	"width" real DEFAULT 30 NOT NULL,
	"height" real DEFAULT 30 NOT NULL,
	"z_index" integer DEFAULT 0 NOT NULL,
	"props_override" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_bindings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "canvas_height" integer DEFAULT 480 NOT NULL;--> statement-breakpoint
ALTER TABLE "component_library" ADD COLUMN "github_path" text;--> statement-breakpoint
ALTER TABLE "component_library" ADD COLUMN "css_github_path" text;--> statement-breakpoint
ALTER TABLE "component_library" ADD COLUMN "prop_schema" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "page_section_components" ADD CONSTRAINT "page_section_components_section_id_page_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."page_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_section_components" ADD CONSTRAINT "page_section_components_component_id_component_library_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."component_library"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_library" DROP COLUMN "tsx_code";--> statement-breakpoint
ALTER TABLE "component_library" DROP COLUMN "css_code";