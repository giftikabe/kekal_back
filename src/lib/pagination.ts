import type { Context } from "hono";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Reads `?limit=&offset=` from the query string with sane bounds.
 * Public/admin list endpoints on tables that can grow unbounded (products,
 * collections, events, upcoming events) use this instead of returning every
 * row on every request.
 */
export function getPagination(c: Context) {
  const rawLimit = Number.parseInt(c.req.query("limit") ?? "", 10);
  const rawOffset = Number.parseInt(c.req.query("offset") ?? "", 10);

  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  return { limit, offset };
}
