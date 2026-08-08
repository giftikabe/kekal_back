import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { componentLibrary } from "../../db/schema/componentLibrary";

type Bindings = { DATABASE_URL: string };

export const componentLibraryRouter = new Hono<{ Bindings: Bindings }>();

// GET / — list published components (no code fields)
componentLibraryRouter.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const results = await db
    .select({
      id: componentLibrary.id,
      name: componentLibrary.name,
      displayName: componentLibrary.displayName,
      category: componentLibrary.category,
    })
    .from(componentLibrary)
    .where(eq(componentLibrary.status, "published"))
    .orderBy(asc(componentLibrary.category), asc(componentLibrary.displayName));

  c.header("Cache-Control", "public, max-age=30");
  return c.json(results);
});