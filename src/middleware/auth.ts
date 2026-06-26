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

  // Regular admin — check is_active in DB
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select()
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
