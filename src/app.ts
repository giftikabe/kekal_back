import { Hono } from "hono";


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


import { authRouter } from "./routes/auth";

//admin route file source
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


type Bindings = {
  DATABASE_URL: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;
  JWT_SECRET: string;
};

export const app = new Hono<{ Bindings: Bindings }>();

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
app.route("/auth", authRouter);


// admin routes
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