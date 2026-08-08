CREATE TABLE "component_library" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tsx_code" text DEFAULT '' NOT NULL,
	"css_code" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_core" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "component_library_name_unique" UNIQUE("name")
);
