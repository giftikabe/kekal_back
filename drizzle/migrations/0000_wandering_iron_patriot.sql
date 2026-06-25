CREATE TABLE "brand_identity" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "brand_identity_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "brand_message" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "brand_message_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "brand_values" (
	"id" text PRIMARY KEY NOT NULL,
	"icon" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "about_content_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"images" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "about_content_blocks_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "contact_info" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "contact_info_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "designer_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "designer_profile_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "navigation" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"route" text NOT NULL,
	CONSTRAINT "pages_route_unique" UNIQUE("route")
);
--> statement-breakpoint
CREATE TABLE "page_seo" (
	"id" text PRIMARY KEY NOT NULL,
	"route" text NOT NULL,
	"meta_title" text NOT NULL,
	"meta_description" text NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"social_image" text NOT NULL,
	CONSTRAINT "page_seo_route_unique" UNIQUE("route")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"cover_image" text NOT NULL,
	"release_year" integer NOT NULL,
	"created_at" text NOT NULL,
	"status" text NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "page_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"section_name" text NOT NULL,
	"section_header" text NOT NULL,
	"button_labels" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"main_image" text NOT NULL,
	"gallery" text[] DEFAULT '{}' NOT NULL,
	"colors" text[] DEFAULT '{}' NOT NULL,
	"sizes" text[] DEFAULT '{}' NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"intro" text NOT NULL,
	"content" text NOT NULL,
	"featured_image" text NOT NULL,
	"gallery" text[] DEFAULT '{}' NOT NULL,
	"video_url" text,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"event_date" text NOT NULL,
	"location" text NOT NULL,
	"organizer" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "upcoming_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"intro" text NOT NULL,
	"content" text NOT NULL,
	"featured_image" text NOT NULL,
	"category" text NOT NULL,
	"event_date" text NOT NULL,
	"location" text NOT NULL,
	"organizer" text NOT NULL,
	"registration_url" text,
	"cta_text" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	CONSTRAINT "upcoming_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;