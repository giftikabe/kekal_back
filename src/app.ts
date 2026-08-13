import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { brandIdentityRouter } from "./routes/customer/brandIdentity";
import { brandMessageRouter } from "./routes/customer/brandMessage";
import { brandValuesRouter } from "./routes/customer/brandValues";
import { aboutContentBlocksRouter } from "./routes/customer/aboutContentBlocks";
import { contactInfoRouter } from "./routes/customer/contactInfo";
import { designerProfileRouter } from "./routes/customer/designerProfile";
import { navigationRouter } from "./routes/customer/navigation";
import { pagesRouter } from "./routes/customer/pages";
import { pageSectionsRouter } from "./routes/customer/pageSections";
import { pageSeoRouter } from "./routes/customer/pageSeo";
import { collectionsRouter } from "./routes/customer/collections";
import { productsRouter } from "./routes/customer/products";
import { eventsRouter } from "./routes/customer/events";
import { upcomingEventsRouter } from "./routes/customer/upcomingEvents";
import { eventCategoriesRouter } from "./routes/customer/eventCategories";
import { contactRouter } from "./routes/contact";

import { authRouter } from "./routes/auth";

import { adminBrandIdentityRouter } from "./routes/admin/brandIdentity";
import { adminBrandMessageRouter } from "./routes/admin/brandMessage";
import { adminBrandValuesRouter } from "./routes/admin/brandValues";
import { adminAboutContentBlocksRouter } from "./routes/admin/aboutContentBlocks";
import { adminContactInfoRouter } from "./routes/admin/contactInfo";
import { adminDesignerProfileRouter } from "./routes/admin/designerProfile";
import { adminNavigationRouter } from "./routes/admin/navigation";
import { adminPagesRouter } from "./routes/admin/pages";
import { adminPageSectionsRouter } from "./routes/admin/pageSections";
import { adminPageSeoRouter } from "./routes/admin/pageSeo";
import { adminCollectionsRouter } from "./routes/admin/collections";
import { adminProductsRouter } from "./routes/admin/products";
import { adminEventsRouter } from "./routes/admin/events";
import { adminUpcomingEventsRouter } from "./routes/admin/upcomingEvents";
import { adminUsersRouter } from "./routes/admin/users";
import { adminEventCategoriesRouter } from "./routes/admin/eventCategories";

import { adminCustomTablesRouter } from "./routes/admin/customTables";
import { adminCustomTableDataRouter } from "./routes/admin/customTableData";

import { adminComponentLibraryRouter } from "./routes/admin/componentLibrary";
import { componentLibraryRouter } from "./routes/customer/componentLibrary";

import { adminPageBuilderRouter } from "./routes/admin/pageBuilder";

import { adminCommerceRouter } from "./routes/admin/commerce";
import { checkoutRouter } from "./routes/customer/checkout";

import { adminBrandStatsRouter } from "./routes/admin/brandStats";
import { brandStatsRouter } from "./routes/customer/brandStats";

import { adminSectionComponentsRouter } from "./routes/admin/sectionComponents";
import { adminMediaPlaceholdersRouter } from "./routes/admin/mediaPlaceholders";


type Bindings = {
  DATABASE_URL: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  ADMIN_ALLOWED_ORIGINS?: string;
  RESEND_API_KEY: string;
};

export const app = new Hono<{ Bindings: Bindings }>();

app.use("*", secureHeaders());

const DEFAULT_ADMIN_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://kekalliving.com",
  "https://www.kekalliving.com",
];

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const isAdminRoute = c.req.path.startsWith("/admin");

      if (isAdminRoute) {
        const configured = (c.env.ADMIN_ALLOWED_ORIGINS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const allowList = configured.length
          ? configured
          : DEFAULT_ADMIN_ALLOWED_ORIGINS;

        return origin && allowList.includes(origin) ? origin : "";
      }

      return origin || "*";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.route("/brand-identity", brandIdentityRouter);
app.route("/brand-messages", brandMessageRouter);
app.route("/brand-values", brandValuesRouter);
app.route("/about-content-blocks", aboutContentBlocksRouter);
app.route("/contact-info", contactInfoRouter);
app.route("/designer-profile", designerProfileRouter);
app.route("/navigation", navigationRouter);
app.route("/pages", pagesRouter);
app.route("/page-sections", pageSectionsRouter);
app.route("/page-seo", pageSeoRouter);
app.route("/collections", collectionsRouter);
app.route("/products", productsRouter);
app.route("/events", eventsRouter);
app.route("/upcoming-events", upcomingEventsRouter);
app.route("/event-categories", eventCategoriesRouter);
app.route("/auth", authRouter);
app.route("/contact", contactRouter);

app.route("/admin/brand-identity", adminBrandIdentityRouter);
app.route("/admin/brand-messages", adminBrandMessageRouter);
app.route("/admin/brand-values", adminBrandValuesRouter);
app.route("/admin/about-content-blocks", adminAboutContentBlocksRouter);
app.route("/admin/contact-info", adminContactInfoRouter);
app.route("/admin/designer-profile", adminDesignerProfileRouter);
app.route("/admin/navigation", adminNavigationRouter);
app.route("/admin/pages", adminPagesRouter);
app.route("/admin/page-sections", adminPageSectionsRouter);
app.route("/admin/page-seo", adminPageSeoRouter);
app.route("/admin/collections", adminCollectionsRouter);
app.route("/admin/products", adminProductsRouter);
app.route("/admin/events", adminEventsRouter);
app.route("/admin/upcoming-events", adminUpcomingEventsRouter);
app.route("/admin/users", adminUsersRouter);
app.route("/admin/event-categories", adminEventCategoriesRouter);

app.route("/admin/custom-tables", adminCustomTablesRouter);
app.route("/admin/custom-data", adminCustomTableDataRouter);

app.route("/admin/component-library", adminComponentLibraryRouter);
app.route("/component-library", componentLibraryRouter);

app.route("/admin/page-builder", adminPageBuilderRouter);

app.route("/admin/commerce", adminCommerceRouter);
app.route("/checkout", checkoutRouter);

app.route("/admin/brand-stats", adminBrandStatsRouter);
app.route("/brand-stats", brandStatsRouter);

app.route("/media-placeholders", adminMediaPlaceholdersRouter);
app.route("/section-components", adminSectionComponentsRouter);


app.notFound((c) => c.json({ error: "Not found" }, 404));

// ─── Centralized error handler ────────────────────────────────────────────
app.onError((err: any, c) => {
  console.error("Unhandled error:", err);

  if (err instanceof SyntaxError) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Postgres unique violation / foreign key violation
  if (err?.code === "23505") {
    return c.json({ error: "A record with this value already exists." }, 409);
  }
  if (err?.code === "23503") {
    return c.json(
      { error: "Referenced record does not exist, or is still in use." },
      409,
    );
  }

  // Postgres "relation already exists" — thrown by CREATE TABLE when a table
  // with the same name was already created. Return a clean 409 instead of a
  // generic 500 so the frontend can surface a meaningful message to the admin.
  if (err?.code === "42P07") {
    return c.json({ error: "A table with this name already exists." }, 409);
  }

  return c.json({ error: "Internal server error" }, 500);
});