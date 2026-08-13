/**
 * Shared code-generation helpers used by both the component-instance
 * publish flow (page-builder.ts) and, indirectly, by anything that needs
 * to turn a data binding into a literal prop value.
 *
 * IMPORTANT ASSUMPTION: this file assumes a Drizzle `db` object with the
 * standard tables (collections, products, events, upcomingEvents) plus a
 * generic way to read one row from a *custom* table by id. Your custom
 * tables implementation lives in routes/admin/customTables.ts /
 * customData.ts, which wasn't in the files I was given — the
 * `resolveCustomTableRecord` function below is a best-effort SQL fallback.
 * If your custom tables are stored differently (e.g. one real Postgres
 * table per custom table, created dynamically), swap that one function out
 * for whatever your existing customData GET route uses internally.
 */
import { eq, sql } from "drizzle-orm";

export interface DataBinding {
  source: "products" | "collections" | "events" | "upcomingEvents" | string; // "custom:<tableName>"
  recordId: string;
  field: string;
}

export type DataBindingsMap = Record<string, DataBinding>;

async function resolveCustomTableRecord(
  db: any,
  tableName: string,
  recordId: string,
  field: string
): Promise<unknown> {
  // Generic fallback: assumes custom table data lives in a table literally
  // named after `tableName` with an `id` primary key. Adjust to match your
  // actual custom-tables storage strategy.
  try {
    const rows: any[] = await db.execute(
      sql.raw(
        `select * from "${tableName}" where id = '${recordId.replace(/'/g, "''")}' limit 1`
      )
    );
    const row = Array.isArray(rows) ? rows[0] : (rows as any)?.rows?.[0];
    return row ? row[field] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolves every prop's data binding to its literal current value.
 * Returns a plain object suitable for JSON.stringify-ing into generated
 * JSX props, exactly like the existing componentConfig flow already does.
 */
export async function resolveDataBindings(
  db: any,
  tables: {
    products: any;
    collections: any;
    events: any;
    upcomingEvents: any;
  },
  bindings: DataBindingsMap
): Promise<Record<string, unknown>> {
  const resolved: Record<string, unknown> = {};

  for (const [propName, binding] of Object.entries(bindings || {})) {
    if (!binding?.recordId || !binding?.field) continue;

    if (binding.source === "products") {
      const rows = await db
        .select()
        .from(tables.products)
        .where(eq(tables.products.id, binding.recordId));
      resolved[propName] = rows[0]?.[binding.field];
    } else if (binding.source === "collections") {
      const rows = await db
        .select()
        .from(tables.collections)
        .where(eq(tables.collections.id, binding.recordId));
      resolved[propName] = rows[0]?.[binding.field];
    } else if (binding.source === "events") {
      const rows = await db
        .select()
        .from(tables.events)
        .where(eq(tables.events.id, binding.recordId));
      resolved[propName] = rows[0]?.[binding.field];
    } else if (binding.source === "upcomingEvents") {
      const rows = await db
        .select()
        .from(tables.upcomingEvents)
        .where(eq(tables.upcomingEvents.id, binding.recordId));
      resolved[propName] = rows[0]?.[binding.field];
    } else if (binding.source.startsWith("custom:")) {
      const tableName = binding.source.slice("custom:".length);
      resolved[propName] = await resolveCustomTableRecord(
        db,
        tableName,
        binding.recordId,
        binding.field
      );
    }
  }

  return resolved;
}

function literalToJsxAttr(key: string, value: unknown): string {
  if (typeof value === "string") return `${key}="${value.replace(/"/g, "&quot;")}"`;
  if (typeof value === "boolean") return value ? key : "";
  if (value === undefined || value === null) return "";
  return `${key}={${JSON.stringify(value)}}`;
}

export interface ComponentInstanceForCodegen {
  id: string;
  componentName: string; // PascalCase, matches the import
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  props: Record<string, unknown>; // propsOverride merged with resolved dataBindings
}

/**
 * Generates the JSX for one section's free-form canvas: a positioned
 * wrapper div per component instance, absolutely placed using the
 * percentage coordinates captured in the builder.
 */
export function generateSectionJSX(
  sectionCanvasHeightPx: number,
  instances: ComponentInstanceForCodegen[]
): string {
  if (instances.length === 0) {
    return `        {/* Empty section */}`;
  }

  const children = instances
    .map((inst) => {
      const propsStr = Object.entries(inst.props)
        .map(([k, v]) => literalToJsxAttr(k, v))
        .filter(Boolean)
        .join(" ");
      return `          <div style={{ position: 'absolute', left: '${inst.x}%', top: '${inst.y}%', width: '${inst.width}%', height: '${inst.height}%', zIndex: ${inst.zIndex} }}>
            <${inst.componentName} ${propsStr} />
          </div>`;
    })
    .join("\n");

  return `        <div style={{ position: 'relative', width: '100%', height: ${sectionCanvasHeightPx} }}>
${children}
        </div>`;
}
