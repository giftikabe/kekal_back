import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pageSeo } from "../../db/schema/pageSeo";
import { brandIdentity } from "../../db/schema/brandIdentity";

type Bindings = { DATABASE_URL: string };

export const pageSeoRouter = new Hono<{ Bindings: Bindings }>();

pageSeoRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(pageSeo);
  return c.json(result);
});

// fallbackImage: the calling page's own main/cover/featured image, passed by the
// frontend since it already has the entity loaded. logoFallback only kicks in if
// neither socialImage nor fallbackImage are available.
pageSeoRouter.get("/by-route", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const route = c.req.query("route");
  const fallbackImage = c.req.query("fallbackImage");
  if (!route) return c.json({ error: "route query param required" }, 400);

  const result = await db
    .select()
    .from(pageSeo)
    .where(eq(pageSeo.route, route));
  const seo = result[0];

  let resolvedSocialImage = seo?.socialImage || fallbackImage || null;
  if (!resolvedSocialImage) {
    const logoResult = await db
      .select()
      .from(brandIdentity)
      .where(eq(brandIdentity.key, "logo"));
    resolvedSocialImage = logoResult[0]?.value || null;
  }

  if (!seo) {
    return c.json(
      { error: "Not found", socialImage: resolvedSocialImage },
      404,
    );
  }

  return c.json({ ...seo, socialImage: resolvedSocialImage });
});
