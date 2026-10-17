CREATE TABLE "sitota" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"main_image" text NOT NULL,
	"gallery" text[] DEFAULT '{}' NOT NULL,
	"colors" text[] DEFAULT '{}' NOT NULL,
	"sizes" text[] DEFAULT '{}' NOT NULL,
	"occasion" text DEFAULT 'Thoughtful gifting' NOT NULL,
	"gift_note" text DEFAULT '' NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sitota_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DROP TABLE "custom_tables" CASCADE;--> statement-breakpoint
DROP TABLE "media_placeholders" CASCADE;--> statement-breakpoint
CREATE INDEX "sitota_featured_idx" ON "sitota" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "sitota_in_stock_idx" ON "sitota" USING btree ("in_stock");