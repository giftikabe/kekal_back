CREATE TABLE "custom_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "custom_tables_name_unique" UNIQUE("name")
);