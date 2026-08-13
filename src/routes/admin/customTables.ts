import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { createDb } from "../../db/index";
import { customTables, type StoredColumnDef } from "../../db/schema/customTables";
import { authMiddleware, requirePermission } from "../../middleware/auth";
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

const RESERVED_COLUMN_NAMES = new Set(["id", "created_at", "updated_at"]);
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/;
const MAX_IDENTIFIER_LENGTH = 63;

interface IncomingColumnDefinition {
  name?: string;
  label: string;
  type: keyof typeof COLUMN_TYPES;
  required?: boolean;
}

interface IntrospectedColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

function slugify(input: string): string {
  const base = (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_IDENTIFIER_LENGTH);

  if (!base || !/^[a-z]/.test(base)) return "";
  return base;
}

function resolveUniqueIdentifier(
  label: string,
  fallbackPrefix: string,
  index: number,
  used: Set<string>,
): string {
  let base = slugify(label);
  if (!base || RESERVED_COLUMN_NAMES.has(base) || !IDENTIFIER_PATTERN.test(base)) {
    base = `${fallbackPrefix}_${index + 1}`;
  }

  let candidate = base;
  let suffix = 2;
  while (used.has(candidate) || RESERVED_COLUMN_NAMES.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

// Only used to backfill LEGACY rows created before `columns` existed (e.g.
// your "shdehrf" demo table). Physical Postgres types can't tell us which
// semantic type a TEXT column originally was, so everything falls back to
// "text" — the admin can re-pick the correct type per column afterwards.
// This runs once per legacy row; the result is persisted so it's never
// guessed again.
function guessTypeFromSql(dataType: string): keyof typeof COLUMN_TYPES {
  const t = (dataType || "").toLowerCase();
  if (t === "boolean") return "boolean";
  if (["integer", "bigint", "smallint", "numeric", "real", "double precision"].includes(t)) return "number";
  return "text";
}

async function backfillColumnsIfMissing(
  sql: NeonQueryFunction<false, false>,
  db: ReturnType<typeof createDb>,
  row: typeof customTables.$inferSelect,
): Promise<StoredColumnDef[]> {
  if (row.columns && row.columns.length > 0) return row.columns;

  let introspected: IntrospectedColumn[] = [];
  try {
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = ${row.name} AND table_schema = 'public'
      AND column_name NOT IN ('id', 'created_at', 'updated_at')
      ORDER BY ordinal_position
    `;
    introspected = result as unknown as IntrospectedColumn[];
  } catch {
    return [];
  }

  if (introspected.length === 0) return [];

  const backfilled: StoredColumnDef[] = introspected.map((c) => ({
    name: c.column_name,
    label: c.column_name.replace(/_/g, " "),
    type: guessTypeFromSql(c.data_type),
    required: c.is_nullable === "NO",
  }));

  try {
    await db.update(customTables).set({ columns: backfilled }).where(eq(customTables.id, row.id));
  } catch {
    // best-effort — still return the guessed columns even if persisting failed
  }

  return backfilled;
}

adminCustomTablesRouter.get("/", authMiddleware, requirePermission("custom_tables", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const rows = await db.select().from(customTables);
  const sql = neon(c.env.DATABASE_URL);

  const rowsWithColumns = await Promise.all(
    rows.map(async (row) => {
      try {
        const columns = await backfillColumnsIfMissing(sql, db, row);
        return { ...row, columns };
      } catch {
        return { ...row, columns: [] };
      }
    }),
  );

  return c.json({
    customTables: rowsWithColumns,
    coreTables: PROTECTED_TABLE_NAMES.map((name) => ({ name, is_deletable: false })),
  });
});

adminCustomTablesRouter.post("/", authMiddleware, requirePermission("custom_tables", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json<{
    name?: string;
    display_name: string;
    columns: IncomingColumnDefinition[];
  }>();
  const { display_name, columns } = body;

  if (!display_name || !display_name.trim()) {
    return c.json({ error: "Display name is required" }, 400);
  }
  if (!Array.isArray(columns) || columns.length < 1) {
    return c.json({ error: "At least one column is required" }, 400);
  }
  for (const col of columns) {
    if (!col.label || !col.label.trim()) {
      return c.json({ error: "Every column needs a label" }, 400);
    }
    if (!COLUMN_TYPES[col.type]) {
      return c.json({ error: `Invalid column type: ${col.type}` }, 400);
    }
  }

  const existingTables = await db.select({ name: customTables.name }).from(customTables);
  const usedTableNames = new Set<string>([
    ...PROTECTED_TABLE_NAMES,
    ...existingTables.map((t) => t.name),
  ]);

  let tableName = slugify(body.name || display_name) || slugify(display_name);
  if (!tableName || !IDENTIFIER_PATTERN.test(tableName)) {
    tableName = "table_1";
  }
  if (usedTableNames.has(tableName)) {
    let suffix = 2;
    let candidate = `${tableName}_${suffix}`;
    while (usedTableNames.has(candidate)) {
      suffix += 1;
      candidate = `${tableName}_${suffix}`;
    }
    tableName = candidate;
  }

  const usedColumnNames = new Set<string>();
  const resolvedColumns: StoredColumnDef[] = columns.map((col, index) => ({
    name: resolveUniqueIdentifier(col.label, "col", index, usedColumnNames),
    label: col.label,
    type: col.type,
    required: !!col.required,
  }));

  const columnDefs = resolvedColumns
    .map((col) => {
      const sqlType = COLUMN_TYPES[col.type as keyof typeof COLUMN_TYPES].sql_type;
      const notNull = col.required ? " NOT NULL" : "";
      return `"${col.name}" ${sqlType}${notNull}`;
    })
    .join(", ");

  const createTableSql = `CREATE TABLE "${tableName}" (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT, ${columnDefs})`;

  const sql = neon(c.env.DATABASE_URL);

  let tableCreated = false;
  try {
    await sql.unsafe(createTableSql);
    tableCreated = true;

    const newRecord = {
      id: crypto.randomUUID(),
      name: tableName,
      displayName: display_name.trim(),
      createdAt: new Date().toISOString(),
      // ← the actual fix: persist what was chosen, not just the physical table
      columns: resolvedColumns,
    } as typeof customTables.$inferInsert;

    await db.insert(customTables).values(newRecord);

    return c.json({ ...newRecord, columns: resolvedColumns }, 201);
  } catch (err) {
    if (tableCreated) {
      try {
        await sql.unsafe(`DROP TABLE IF EXISTS "${tableName}"`);
      } catch {
        // best-effort cleanup only
      }
    }
    return c.json({ error: "Failed to create table. Please try again." }, 500);
  }
});

adminCustomTablesRouter.delete("/:id", authMiddleware, requirePermission("custom_tables", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(customTables).where(eq(customTables.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);

  const record = result[0];
  const sql = neon(c.env.DATABASE_URL);
  await sql.unsafe(`DROP TABLE IF EXISTS "${record.name}"`);
  await db.delete(customTables).where(eq(customTables.id, c.req.param("id")));
  return c.json({ message: "Deleted successfully" });
});

adminCustomTablesRouter.get("/:id/columns", authMiddleware, requirePermission("custom_tables", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.select().from(customTables).where(eq(customTables.id, c.req.param("id")));
  if (!result[0]) return c.json({ error: "Not found" }, 404);

  const sql = neon(c.env.DATABASE_URL);
  const columns = await backfillColumnsIfMissing(sql, db, result[0]);

  return c.json(columns);
});