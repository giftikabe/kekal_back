import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db/index";
import { mediaPlaceholders } from "../../db/schema/mediaPlaceholders";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";

type Bindings = { DATABASE_URL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminMediaPlaceholdersRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const DEFAULTS = [
  { key: "default_image", url: "https://placehold.co/800x600/f7f5f1/141414?text=Image", label: "Default image placeholder" },
  { key: "default_video", url: "https://cdn.coverr.co/videos/coverr-placeholder/1080p.mp4", label: "Default video placeholder" },
];

// GET / — always returns both rows, seeding defaults on first read if missing
adminMediaPlaceholdersRouter.get("/", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const existing = await db.select().from(mediaPlaceholders);

  const missing = DEFAULTS.filter((d) => !existing.some((e) => e.key === d.key));
  if (missing.length > 0) {
    await db.insert(mediaPlaceholders).values(missing);
  }

  return c.json(missing.length > 0 ? [...existing, ...missing] : existing);
});

// PATCH /:key — update a placeholder's URL/label
adminMediaPlaceholdersRouter.patch("/:key", authMiddleware, requirePermission("brand", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const data = pickFields(body, ALLOWED_FIELDS.mediaPlaceholders);

  await db.update(mediaPlaceholders).set(data).where(eq(mediaPlaceholders.key, c.req.param("key")));
  const result = await db.select().from(mediaPlaceholders).where(eq(mediaPlaceholders.key, c.req.param("key")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});
