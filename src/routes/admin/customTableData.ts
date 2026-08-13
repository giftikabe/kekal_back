import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { createDb } from "../../db/index";
import { customTables } from "../../db/schema/customTables";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { getPagination } from "../../lib/pagination";

type Bindings = { DATABASE_URL: string; JWT_SECRET: string; SUPER_ADMIN_EMAIL: string };
type Variables = { userId: string; email: string; isSuperAdmin: boolean; permissions: string[] };

export const adminCustomTableDataRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function validateTableName(tableName: string, db: ReturnType<typeof createDb>): Promise<boolean> {
  const result = await db.select().from(customTables).where(eq(customTables.name, tableName));
  return result.length > 0;
}

async function getTableColumns(sql: NeonQueryFunction<false, false>, tableName: string): Promise<string[]> {
  const rows = (await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' AND column_name NOT IN ('id', 'created_at', 'updated_at') ORDER BY ordinal_position`,
    [tableName]
  )) as unknown as Array<{ column_name: string }>;
  return rows.map((r) => r.column_name);
}

// GET: Retrieve records with pagination
adminCustomTableDataRouter.get("/:tableName", authMiddleware, requirePermission("custom_tables", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tableName = c.req.param("tableName");

  const exists = await validateTableName(tableName, db);
  if (!exists) return c.json({ error: "Table not found" }, 404);

  const { limit, offset } = getPagination(c);
  const sql = neon(c.env.DATABASE_URL);

  try {
    const rows = await sql.query(`SELECT * FROM "${tableName}" ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    return c.json(rows);
  } catch (err: any) {
    return c.json({ error: err?.message || "Failed to fetch records" }, 400);
  }
});

// POST: Create a new record
adminCustomTableDataRouter.post("/:tableName", authMiddleware, requirePermission("custom_tables", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tableName = c.req.param("tableName");

  const exists = await validateTableName(tableName, db);
  if (!exists) return c.json({ error: "Table not found" }, 404);

  const body = await c.req.json<Record<string, unknown>>();
  const sql = neon(c.env.DATABASE_URL);
  const validColumns = await getTableColumns(sql, tableName);

  const bodyKeys = Object.keys(body);
  const rejectedKeys = bodyKeys.filter((k) => !validColumns.includes(k));
  if (rejectedKeys.length > 0) {
    return c.json(
      {
        error: `Unknown column(s): ${rejectedKeys.join(", ")}. This table has columns: ${validColumns.join(", ")}`,
      },
      400,
    );
  }

  const filteredEntries = Object.entries(body).filter(([key]) => validColumns.includes(key));

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const columnNames = ["id", "created_at", "updated_at", ...filteredEntries.map(([key]) => key)];
  const values: unknown[] = [id, now, now, ...filteredEntries.map(([, value]) => value)];

  const columnList = columnNames.map((col) => `"${col}"`).join(", ");
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

  const insertSql = `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders}) RETURNING *`;

  try {
    const inserted = (await sql.query(insertSql, values)) as unknown as Array<Record<string, unknown>>;
    return c.json(inserted[0], 201);
  } catch (err: any) {
    return c.json({ error: err?.message || "Insert failed" }, 400);
  }
});

// PATCH: Update an existing record
adminCustomTableDataRouter.patch("/:tableName/:id", authMiddleware, requirePermission("custom_tables", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tableName = c.req.param("tableName");
  const id = c.req.param("id");

  const exists = await validateTableName(tableName, db);
  if (!exists) return c.json({ error: "Table not found" }, 404);

  const body = await c.req.json<Record<string, unknown>>();
  const sql = neon(c.env.DATABASE_URL);
  const validColumns = await getTableColumns(sql, tableName);

  const bodyKeys = Object.keys(body);
  const rejectedKeys = bodyKeys.filter((k) => !validColumns.includes(k) && k !== "id" && k !== "created_at");
  if (rejectedKeys.length > 0) {
    return c.json(
      {
        error: `Unknown column(s): ${rejectedKeys.join(", ")}`,
      },
      400,
    );
  }

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

  try {
    const updated = (await sql.query(updateSql, values)) as unknown as Array<Record<string, unknown>>;
    if (!updated || updated.length === 0) return c.json({ error: "Not found" }, 404);
    return c.json(updated[0]);
  } catch (err: any) {
    return c.json({ error: err?.message || "Update failed" }, 400);
  }
});

// DELETE: Remove a record
adminCustomTableDataRouter.delete("/:tableName/:id", authMiddleware, requirePermission("custom_tables", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tableName = c.req.param("tableName");
  const id = c.req.param("id");

  const exists = await validateTableName(tableName, db);
  if (!exists) return c.json({ error: "Table not found" }, 404);

  const sql = neon(c.env.DATABASE_URL);

  try {
    const deleted = (await sql.query(`DELETE FROM "${tableName}" WHERE id = $1 RETURNING id`, [id])) as unknown as Array<Record<string, unknown>>;
    if (!deleted || deleted.length === 0) return c.json({ error: "Not found" }, 404);
    return c.json({ message: "Deleted successfully" });
  } catch (err: any) {
    return c.json({ error: err?.message || "Delete failed" }, 400);
  }
});