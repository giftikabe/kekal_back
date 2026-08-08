ALTER TABLE "page_sections" ALTER COLUMN "section_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "page_sections" ALTER COLUMN "section_header" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "component_id" text;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "component_config" text;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "layout_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "is_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "template_name" text;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "created_at" text NOT NULL;