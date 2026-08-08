CREATE TABLE "brand_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "brand_stats_order_idx" ON "brand_stats" USING btree ("order");