CREATE TABLE "commerce_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"chapa_public_key" text DEFAULT '' NOT NULL,
	"chapa_secret_key" text DEFAULT '' NOT NULL,
	"chapa_webhook_secret" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'ETB' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"shipping_address" text NOT NULL,
	"items" text NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'ETB' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chapa_tx_ref" text,
	"chapa_payment_url" text,
	"payment_verified_at" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_chapa_tx_ref_unique" UNIQUE("chapa_tx_ref")
);
--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "orders_chapa_tx_ref_idx" ON "orders" USING btree ("chapa_tx_ref");