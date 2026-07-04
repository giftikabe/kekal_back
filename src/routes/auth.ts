import { Hono } from "hono";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";
import { z } from "zod";
import { createDb } from "../db/index";
import { adminUsers } from "../db/schema/adminUsers";
import { refreshTokens } from "../db/schema/refreshTokens";
import { adminUserRoles } from "../db/schema/adminUserRoles";
import { rolePermissions } from "../db/schema/rolePermissions";
import { userPermissions } from "../db/schema/userPermissions";
import { loginRateLimiter } from "../middleware/auth";

type Bindings = {
  DATABASE_URL: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;
  JWT_SECRET: string;
};

export const authRouter = new Hono<{ Bindings: Bindings }>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Helper: generate tokens ──────────────────────────────────────────────────
async function generateTokens(
  userId: string,
  email: string,
  isSuperAdmin: boolean,
  permissions: string[],
  secret: string,
) {
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await sign(
    {
      sub: userId,
      email,
      isSuperAdmin,
      permissions,
      exp: now + 60 * 60 * 24,
    },
    secret,
    "HS256",
  );

  const refreshToken = await sign(
    {
      sub: userId,
      type: "refresh",
      exp: now + 60 * 60 * 24 * 30,
    },
    secret,
    "HS256",
  );

  return { accessToken, refreshToken };
}

// ─── Helper: get user permissions ────────────────────────────────────────────
// Previously this ran one query to fetch the user's roles, then one *additional*
// query per role to fetch that role's permissions (classic N+1 — a user with
// 5 roles meant 6 round trips). Replaced with a single joined query, plus the
// direct-permissions query.
async function getUserPermissions(
  userId: string,
  db: ReturnType<typeof createDb>,
) {
  const rolePerms = await db
    .select({ entity: rolePermissions.entity, action: rolePermissions.action })
    .from(adminUserRoles)
    .innerJoin(rolePermissions, eq(adminUserRoles.roleId, rolePermissions.roleId))
    .where(eq(adminUserRoles.userId, userId));

  const directPerms = await db
    .select({ entity: userPermissions.entity, action: userPermissions.action })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  const all = [
    ...rolePerms.map((p) => `${p.entity}:${p.action}`),
    ...directPerms.map((p) => `${p.entity}:${p.action}`),
  ];

  return [...new Set(all)];
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
authRouter.post("/login", loginRateLimiter, async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "A valid email and password are required" }, 400);
  }
  const { email, password } = parsed.data;

  const db = createDb(c.env.DATABASE_URL);

  // ── Super admin: check DB first, fallback to env ──────────────────────────
  if (email === c.env.SUPER_ADMIN_EMAIL) {
    const dbResult = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email));

    const superAdminRecord = dbResult[0];

    if (superAdminRecord) {
      const matchesDb = await bcrypt.compare(password, superAdminRecord.passwordHash);

      if (matchesDb) {
        const tokens = await generateTokens("super-admin", email, true, [], c.env.JWT_SECRET);
        return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      }

      // DB password failed — try env password (fallback)
      if (password === c.env.SUPER_ADMIN_PASSWORD) {
        const passwordHash = await bcrypt.hash(password, 10);
        await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.email, email));

        const tokens = await generateTokens("super-admin", email, true, [], c.env.JWT_SECRET);
        return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      }

      return c.json({ error: "Invalid credentials" }, 401);
    }

    // No DB record — check env credentials and auto-create DB record
    if (password === c.env.SUPER_ADMIN_PASSWORD) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.insert(adminUsers).values({
        id: "super-admin",
        email,
        passwordHash,
        name: "Super Admin",
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      const tokens = await generateTokens("super-admin", email, true, [], c.env.JWT_SECRET);
      return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    }

    return c.json({ error: "Invalid credentials" }, 401);
  }

  // ── Regular admin ─────────────────────────────────────────────────────────
  const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  const user = result[0];

  if (!user) return c.json({ error: "Invalid credentials" }, 401);
  if (!user.isActive) return c.json({ error: "Account is deactivated" }, 403);

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) return c.json({ error: "Invalid credentials" }, 401);

  const permissions = await getUserPermissions(user.id, db);
  const tokens = await generateTokens(user.id, user.email, false, permissions, c.env.JWT_SECRET);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    token: tokens.refreshToken,
    expiresAt,
    isRevoked: false,
    createdAt: new Date().toISOString(),
  });

  return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
authRouter.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) return c.json({ error: "Refresh token required" }, 400);

  const db = createDb(c.env.DATABASE_URL);

  let payload: any;
  try {
    payload = await verify(refreshToken, c.env.JWT_SECRET, "HS256");
  } catch {
    return c.json({ error: "Invalid refresh token" }, 401);
  }

  if (payload.type !== "refresh") {
    return c.json({ error: "Invalid token type" }, 401);
  }

  const userId = payload.sub as string;
  const isSuperAdmin = userId === "super-admin";

  if (isSuperAdmin) {
    const tokens = await generateTokens("super-admin", c.env.SUPER_ADMIN_EMAIL, true, [], c.env.JWT_SECRET);
    return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  }

  const result = await db.select().from(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  const storedToken = result[0];

  if (!storedToken) return c.json({ error: "Token not found" }, 401);
  if (storedToken.isRevoked) return c.json({ error: "Token revoked" }, 401);
  if (new Date(storedToken.expiresAt) < new Date()) {
    return c.json({ error: "Token expired" }, 401);
  }

  const userResult = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
  const user = userResult[0];
  if (!user) return c.json({ error: "User not found" }, 401);
  if (!user.isActive) return c.json({ error: "Account deactivated" }, 403);

  const permissions = await getUserPermissions(userId, db);

  await db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.token, refreshToken));

  const tokens = await generateTokens(userId, user.email, false, permissions, c.env.JWT_SECRET);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    userId,
    token: tokens.refreshToken,
    expiresAt,
    isRevoked: false,
    createdAt: new Date().toISOString(),
  });

  return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
authRouter.post("/logout", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) return c.json({ error: "Refresh token required" }, 400);

  const db = createDb(c.env.DATABASE_URL);
  await db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.token, refreshToken));

  return c.json({ message: "Logged out successfully" });
});
