import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { createDb } from "../../db/index";
import { componentLibrary } from "../../db/schema/componentLibrary";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";
import { commitFileToFrontend } from "../../lib/github";

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SUPER_ADMIN_EMAIL: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO_FRONTEND: string;
  GITHUB_BRANCH: string;
};
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminComponentLibraryRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Map snake_case keys extracted by pickFields() to the camelCase property
 * names that Drizzle recognises. Fields that are already single words
 * (category, description, name) are untouched.
 */
function mapToCamel(data: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = { ...data };

  if ("display_name" in mapped) {
    mapped.displayName = mapped.display_name;
    delete mapped.display_name;
  }
  if ("tsx_code" in mapped) {
    mapped.tsxCode = mapped.tsx_code;
    delete mapped.tsx_code;
  }
  if ("css_code" in mapped) {
    mapped.cssCode = mapped.css_code;
    delete mapped.css_code;
  }

  return mapped;
}

// GET / — list all components (no code fields)
adminComponentLibraryRouter.get("/", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const results = await db
    .select({
      id: componentLibrary.id,
      name: componentLibrary.name,
      displayName: componentLibrary.displayName,
      category: componentLibrary.category,
      status: componentLibrary.status,
      isCore: componentLibrary.isCore,
    })
    .from(componentLibrary)
    .orderBy(asc(componentLibrary.category), asc(componentLibrary.displayName));
  return c.json(results);
});

// GET /:id — full record including code
adminComponentLibraryRouter.get("/:id", authMiddleware, requirePermission("brand", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select()
    .from(componentLibrary)
    .where(eq(componentLibrary.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

// POST / — create component
adminComponentLibraryRouter.post("/", authMiddleware, requirePermission("brand", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();

  // Validate name format
  if (!body.name || !/^[A-Z][A-Za-z0-9]+$/.test(body.name)) {
    return c.json({ error: "name must match /^[A-Z][A-Za-z0-9]+$/" }, 400);
  }

  // pickFields extracts snake_case keys; mapToCamel converts them to what Drizzle expects.
  const data = mapToCamel(pickFields(body, ALLOWED_FIELDS.componentLibrary));

  // displayName is NOT NULL in the DB — validate/fallback before insert.
  if (!data.displayName || String(data.displayName).trim() === "") {
    // mapToCamel already handled display_name → displayName above, so only
    // the fallback derivation from `name` is needed here.
    data.displayName = body.name.replace(/([a-z])([A-Z0-9])/g, "$1 $2");
  }

  const now = new Date().toISOString();
  const newRecord = {
    id: crypto.randomUUID(),
    ...data,
    status: "draft",
    isCore: false,
    createdAt: now,
    updatedAt: now,
  } as typeof componentLibrary.$inferInsert;

  await db.insert(componentLibrary).values(newRecord);
  return c.json(newRecord, 201);
});

// PATCH /:id — update component (cannot change name or isCore)
adminComponentLibraryRouter.patch("/:id", authMiddleware, requirePermission("brand", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();

  // Strip protected fields
  delete body.name;
  delete body.isCore;
  delete body.is_core;

  // pickFields extracts snake_case keys; mapToCamel converts them to what Drizzle expects.
  const data = mapToCamel(pickFields(body, ALLOWED_FIELDS.componentLibrary));

  // Never allow displayName to be explicitly nulled out via PATCH.
  // This check now actually runs because mapToCamel populated data.displayName correctly.
  if ("displayName" in data && (!data.displayName || String(data.displayName).trim() === "")) {
    return c.json({ error: "displayName cannot be empty" }, 400);
  }

  const updatedAt = new Date().toISOString();

  await db
    .update(componentLibrary)
    .set({ ...data, updatedAt })
    .where(eq(componentLibrary.id, c.req.param("id")));

  const result = await db
    .select()
    .from(componentLibrary)
    .where(eq(componentLibrary.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(result[0]);
});

// DELETE /:id — delete component (core components protected)
adminComponentLibraryRouter.delete("/:id", authMiddleware, requirePermission("brand", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select()
    .from(componentLibrary)
    .where(eq(componentLibrary.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  if (result[0].isCore) return c.json({ error: "Core components cannot be deleted" }, 403);
  await db.delete(componentLibrary).where(eq(componentLibrary.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});

// POST /:id/publish — commit component files to frontend repo
adminComponentLibraryRouter.post("/:id/publish", authMiddleware, requirePermission("brand", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select()
    .from(componentLibrary)
    .where(eq(componentLibrary.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);

  const component = result[0];

  if (!component.tsxCode || component.tsxCode.trim() === "") {
    return c.json({ error: "Cannot publish component with no code" }, 400);
  }

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO_FRONTEND, GITHUB_BRANCH } = c.env;

  if (!GITHUB_TOKEN) {
    return c.json(
      { success: false, error: "GitHub not configured. Run: wrangler secret put GITHUB_TOKEN" },
      503
    );
  }

  // Commit TSX file
  const tsxResult = await commitFileToFrontend(
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO_FRONTEND,
    GITHUB_BRANCH,
    `src/kekal/components/${component.name}.tsx`,
    component.tsxCode,
    `feat: publish component ${component.name} from Component Library`
  );

  if (!tsxResult.success) {
    return c.json({ success: false, error: tsxResult.error });
  }

  // Commit CSS file if present
  if (component.cssCode && component.cssCode.trim() !== "") {
    await commitFileToFrontend(
      GITHUB_TOKEN,
      GITHUB_OWNER,
      GITHUB_REPO_FRONTEND,
      GITHUB_BRANCH,
      `src/kekal/components/${component.name}.module.css`,
      component.cssCode,
      `feat: publish styles for ${component.name} from Component Library`
    );
  }

  // Update status to published
  const updatedAt = new Date().toISOString();
  await db
    .update(componentLibrary)
    .set({ status: "published", updatedAt })
    .where(eq(componentLibrary.id, component.id));

  return c.json({ success: true, commit_url: tsxResult.commit_url });
});