import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { eq } from "drizzle-orm";
import { createDb } from "../db/index";
import { adminUsers } from "../db/schema/adminUsers";

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SUPER_ADMIN_EMAIL: string;
};

type Variables = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  let payload: any;
  try {
    payload = await verify(token, c.env.JWT_SECRET, "HS256");
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const userId = payload.sub as string;
  const isSuperAdmin = payload.isSuperAdmin as boolean;

  // Super admin — no DB check needed
  if (isSuperAdmin) {
    c.set("userId", userId);
    c.set("email", payload.email);
    c.set("isSuperAdmin", true);
    c.set("permissions", []);
    return next();
  }

  // Regular admin — check is_active in DB.
  // Only select the columns we actually need (perf: avoids pulling
  // passwordHash/name/etc. off the wire on every authenticated request).
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select({ id: adminUsers.id, isActive: adminUsers.isActive })
    .from(adminUsers)
    .where(eq(adminUsers.id, userId));

  const user = result[0];

  if (!user) return c.json({ error: "User not found" }, 401);
  if (!user.isActive) return c.json({ error: "Account deactivated" }, 403);

  c.set("userId", userId);
  c.set("email", payload.email);
  c.set("isSuperAdmin", false);
  c.set("permissions", payload.permissions as string[]);

  return next();
});

// ─── Permission checker ───────────────────────────────────────────────────────
export const requirePermission = (entity: string, action: string) =>
  createMiddleware<{
    Bindings: Bindings;
    Variables: Variables;
  }>(async (c, next) => {
    const isSuperAdmin = c.get("isSuperAdmin");

    // Super admin bypasses all permission checks
    if (isSuperAdmin) return next();

    const permissions = c.get("permissions");
    const required = `${entity}:${action}`;

    if (!permissions.includes(required)) {
      return c.json({ error: `Missing permission: ${required}` }, 403);
    }

    return next();
  });

// ─── Basic login rate limiter ─────────────────────────────────────────────────
// NOTE: this is an in-memory, per-isolate limiter. On Cloudflare Workers each
// isolate is short-lived and requests can land on different isolates, so this
// is a defense-in-depth layer only — it is NOT a substitute for a real rate
// limit. Before going live, also configure a Cloudflare Rate Limiting Rule
// (or a Durable Object / KV-backed limiter) in front of POST /auth/login.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

export const loginRateLimiter = createMiddleware(async (c, next) => {
  const ip =
    c.req.header("CF-Connecting-IP") ||
    c.req.header("x-forwarded-for") ||
    "unknown";
  const now = Date.now();

  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
      return c.json(
        { error: "Too many login attempts. Please try again later." },
        429,
      );
    }
    entry.count++;
  }

  return next();
});
