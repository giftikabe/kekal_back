import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { createDb } from "../../db/index";
import { customTables } from "../../db/schema/customTables";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { getPagination } from "../../lib/pagination";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminCustomTableDataRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Confirms tableName is a table the user actually created via the DB manager
// (i.e. it exists as a row in the custom_tables meta-table). Only names that
// pass this check are ever interpolated into raw SQL below.
async function validateTableName(tableName: string, db: ReturnType<typeof createDb>): Promise<boolean> {
  const result = await db.select().from(customTables).where(eq(customTables.name, tableName));
  return result.length > 0;
}

async function getTableColumns(sql: ReturnType<typeof neon>, tableName: string): Promise<string[]> {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = ${tableName} AND table_schema = 'public'
    AND column_name NOT IN ('id', 'created_at', 'updated_at')
    ORDER BY ordinal_position
  `;
  return rows.map((r: any) => r.column_name as string);
}

adminCustomTableDataRouter.get("/:tableName", authMiddleware, requirePermission("custom_tables", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tableName = c.req.param("tableName");

  const exists = await validateTableName(tableName, db);
  if (!exists) return c.json({ error: "Table not found" }, 404);

  const { limit, offset } = getPagination(c);
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql.unsafe(
    `SELECT * FROM "${tableName}" ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
  );

  return c.json(rows);
});

adminCustomTableDataRouter.post("/:tableName", authMiddleware, requirePermission("custom_tables", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tableName = c.req.param("tableName");

  const exists = await validateTableName(tableName, db);
  if (!exists) return c.json({ error: "Table not found" }, 404);

  const body = await c.req.json<Record<string, unknown>>();
  const sql = neon(c.env.DATABASE_URL);
  const validColumns = await getTableColumns(sql, tableName);

  // Only keys that match an actual column on this table (as reported by
  // information_schema) are ever used to build the INSERT statement.
  const filteredEntries = Object.entries(body).filter(([key]) => validColumns.includes(key));

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const columnNames = ["id", "created_at", "updated_at", ...filteredEntries.map(([key]) => key)];
  const values: unknown[] = [id, now, now, ...filteredEntries.map(([, value]) => value)];

  const columnList = columnNames.map((col) => `"${col}"`).join(", ");
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

  const insertSql = `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders}) RETURNING *`;
  const inserted = await sql.unsafe(insertSql, values);

  return c.json(inserted[0], 201);
});

adminCustomTableDataRouter.patch("/:tableName/:id", authMiddleware, requirePermission("custom_tables", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tableName = c.req.param("tableName");
  const id = c.req.param("id");

  const exists = await validateTableName(tableName, db);
  if (!exists) return c.json({ error: "Table not found" }, 404);

  const body = await c.req.json<Record<string, unknown>>();
  const sql = neon(c.env.DATABASE_URL);
  const validColumns = await getTableColumns(sql, tableName);

  const filteredEntries = Object.entries(body).filter(
    ([key]) => validColumns.includes(key) && key !== "id" && key !== "created_at"
  );

  const now = new Date().toISOString();
  const setEntries: [string, unknown][] = [...filteredEntries, ["updated_at", now]];

  if (setEntries.length === 0) {
    return c.json({ error: "No valid fields to update" }, 400);
  }

  const setClause = setEntries.map(([key], i) => `"${key}" = $${i + 1}`).join(", ");
  const values = setEntries.map(([, value]) => value);
  values.push(id);

  const updateSql = `UPDATE "${tableName}" SET ${setClause} WHERE id = $${values.length} RETURNING *`;
  const updated = await sql.unsafe(updateSql, values);

  if (!updated[0]) return c.json({ error: "Not found" }, 404);
  return c.json(updated[0]);
});

adminCustomTableDataRouter.delete("/:tableName/:id", authMiddleware, requirePermission("custom_tables", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tableName = c.req.param("tableName");
  const id = c.req.param("id");

  const exists = await validateTableName(tableName, db);
  if (!exists) return c.json({ error: "Table not found" }, 404);

  const sql = neon(c.env.DATABASE_URL);
  await sql.unsafe(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);

  return c.json({ message: "Deleted successfully" });
});