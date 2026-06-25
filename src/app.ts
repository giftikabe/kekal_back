import { Hono } from "hono";
import { brandIdentityRouter } from "./routes/brandIdentity";
import { brandMessageRouter } from "./routes/brandMessage";
import { brandValuesRouter } from "./routes/brandValues";
import { aboutContentBlocksRouter } from "./routes/aboutContentBlocks";
import { contactInfoRouter } from "./routes/contactInfo";
import { designerProfileRouter } from "./routes/designerProfile";
import { navigationRouter } from "./routes/navigation";
import { pagesRouter } from "./routes/pages";
import { pageSectionsRouter } from "./routes/pageSections";
import { pageSeoRouter } from "./routes/pageSeo";
import { collectionsRouter } from "./routes/collections";
import { productsRouter } from "./routes/products";
import { eventsRouter } from "./routes/events";
import { upcomingEventsRouter } from "./routes/upcomingEvents";
import { authRouter } from "./routes/auth";

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