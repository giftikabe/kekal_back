CREATE TABLE "custom_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "custom_tables_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "navigation_order_idx" ON "navigation" USING btree ("order");--> statement-breakpoint
CREATE INDEX "collections_featured_idx" ON "collections" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "collections_created_at_idx" ON "collections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "page_sections_page_id_idx" ON "page_sections" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "products_collection_id_idx" ON "products" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "events_category_id_idx" ON "events" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "events_featured_idx" ON "events" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "upcoming_events_category_id_idx" ON "upcoming_events" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "upcoming_events_featured_idx" ON "upcoming_events" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "admin_user_roles_user_id_idx" ON "admin_user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_user_roles_role_id_idx" ON "admin_user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");