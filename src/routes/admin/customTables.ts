import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { createDb } from "../../db/index";
import { customTables } from "../../db/schema/customTables";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { pickFields } from "../../lib/pickFields";
import { ALLOWED_FIELDS } from "../../lib/allowedFields";
import { COLUMN_TYPES } from "../../lib/customTableTypes";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminCustomTablesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const PROTECTED_TABLE_NAMES = [
  "brand_identity", "brand_message", "brand_values", "about_content_blocks",
  "contact_info", "designer_profile", "navigation", "pages", "page_seo",
  "page_sections", "collections", "products", "events", "upcoming_events",
  "event_categories", "admin_users", "admin_user_roles", "roles", "role_permissions",
  "user_permissions", "refresh_tokens", "custom_tables", "component_library",
  "commerce_settings", "orders", "order_items", "cart_items", "brand_stats",
];

// Identifiers (table + column names) must start with a lowercase letter and
// contain only lowercase letters, digits, and underscores. This is what makes
// it safe to interpolate a validated name into a raw SQL statement below.
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/;

interface IncomingColumnDefinition {
  name: string;
  label: string;
  type: keyof typeof COLUMN_TYPES;
  required?: boolean;
}

adminCustomTablesRouter.get("/", authMiddleware, requirePermission("custom_tables", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const rows = await db.select().from(customTables);
  return c.json({
    customTables: rows,
    coreTables: PROTECTED_TABLE_NAMES.map((name) => ({ name, is_deletable: false })),
  });
});

adminCustomTablesRouter.post("/", authMiddleware, requirePermission("custom_tables", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json<{ name: string; display_name: string; columns: IncomingColumnDefinition[] }>();
  const { name, columns } = body;

  if (!name || !IDENTIFIER_PATTERN.test(name)) {
    return c.json({ error: "Invalid table name" }, 400);
  }

  if (PROTECTED_TABLE_NAMES.includes(name)) {
    return c.json({ error: "Table name is reserved" }, 400);
  }

  if (!Array.isArray(columns) || columns.length < 1) {
    return c.json({ error: "At least one column is required" }, 400);
  }

  for (const col of columns) {
    if (!col.name || !IDENTIFIER_PATTERN.test(col.name)) {
      return c.json({ error: `Invalid column name: ${col.name}` }, 400);
    }
    if (!COLUMN_TYPES[col.type]) {
      return c.json({ error: `Invalid column type: ${col.type}` }, 400);
    }
  }

  // columnDefs is built only from inputs that already passed IDENTIFIER_PATTERN
  // validation above, plus a fixed whitelist of sql_type strings from
  // COLUMN_TYPES, so this is safe to concatenate.
  const columnDefs = columns
    .map((col) => {
      const sqlType = COLUMN_TYPES[col.type].sql_type;
      const notNull = col.required ? " NOT NULL" : "";
      return `"${col.name}" ${sqlType}${notNull}`;
    })
    .join(", ");

  const createTableSql = `CREATE TABLE "${name}" (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT, ${columnDefs})`;

  const sql = neon(c.env.DATABASE_URL);
  await sql.unsafe(createTableSql);

  // pickFields whitelists against the incoming (snake_case) body keys, but
  // Drizzle's insert expects the schema's JS property names (camelCase) —
  // "display_name" from the body must become "displayName" here, or it's
  // silently dropped and the NOT NULL column gets written as null.
  const data = pickFields(body, ALLOWED_FIELDS.customTables);
  const newRecord = {
    id: crypto.randomUUID(),
    name: (data as any).name,
    displayName: (data as any).display_name,
    createdAt: new Date().toISOString(),
  } as typeof customTables.$inferInsert;

  await db.insert(customTables).values(newRecord);
  return c.json(newRecord, 201);
});

adminCustomTablesRouter.delete("/:id", authMiddleware, requirePermission("custom_tables", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(customTables).where(eq(customTables.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);

  const record = result[0];
  const sql = neon(c.env.DATABASE_URL);
  // record.name was validated against IDENTIFIER_PATTERN when the table was created.
  await sql.unsafe(`DROP TABLE IF EXISTS "${record.name}"`);

  await db.delete(customTables).where(eq(customTables.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});

adminCustomTablesRouter.get("/:id/columns", authMiddleware, requirePermission("custom_tables", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(customTables).where(eq(customTables.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);

  const record = result[0];
  const sql = neon(c.env.DATABASE_URL);
  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = ${record.name} AND table_schema = 'public'
    AND column_name NOT IN ('id', 'created_at', 'updated_at')
    ORDER BY ordinal_position
  `;

  return c.json(columns);
});