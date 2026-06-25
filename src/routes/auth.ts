import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";
import { createDb } from "../db/index";
import { adminUsers } from "../db/schema/adminUsers";
import { refreshTokens } from "../db/schema/refreshTokens";
import { adminUserRoles } from "../db/schema/adminUserRoles";
import { rolePermissions } from "../db/schema/rolePermissions";
import { userPermissions } from "../db/schema/userPermissions";

type Bindings = {
  DATABASE_URL: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;
  JWT_SECRET: string;
};

export const authRouter = new Hono<{ Bindings: Bindings }>();

// ─── Helper: generate tokens ──────────────────────────────────────────────────
async function generateTokens(
  userId: string,
  email: string,
  isSuperAdmin: boolean,
  permissions: string[],
  secret: string
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
  "HS256"
);

const refreshToken = await sign(
  {
    sub: userId,
    type: "refresh",
    exp: now + 60 * 60 * 24 * 30,
  },
  secret,
  "HS256"
);

  return { accessToken, refreshToken };
}

// ─── Helper: get user permissions ────────────────────────────────────────────
async function getUserPermissions(userId: string, db: ReturnType<typeof createDb>) {
  // Role permissions
  const userRoles = await db
    .select()
    .from(adminUserRoles)
    .where(eq(adminUserRoles.userId, userId));

  const rolePerms = await Promise.all(
    userRoles.map((ur) =>
      db.select().from(rolePermissions).where(eq(rolePermissions.roleId, ur.roleId))
    )
  );

  // Direct permissions
  const directPerms = await db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  // Merge and deduplicate
  const all = [
    ...rolePerms.flat().map((p) => `${p.entity}:${p.action}`),
    ...directPerms.map((p) => `${p.entity}:${p.action}`),
  ];

  return [...new Set(all)];
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
authRouter.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const db = createDb(c.env.DATABASE_URL);

    if (
      email === c.env.SUPER_ADMIN_EMAIL &&
      password === c.env.SUPER_ADMIN_PASSWORD
    ) {
      const { accessToken, refreshToken } = await generateTokens(
        "super-admin",
        email,
        true,
        [],
        c.env.JWT_SECRET
      );

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db.insert(refreshTokens).values({
        id: crypto.randomUUID(),
        userId: "super-admin",
        token: refreshToken,
        expiresAt,
        isRevoked: false,
        createdAt: new Date().toISOString(),
      });

      return c.json({ accessToken, refreshToken });
    }

    const result = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email));

    const user = result[0];

    if (!user) return c.json({ error: "Invalid credentials" }, 401);
    if (!user.isActive) return c.json({ error: "Account is deactivated" }, 403);

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) return c.json({ error: "Invalid credentials" }, 401);

    const permissions = await getUserPermissions(user.id, db);

    const { accessToken, refreshToken } = await generateTokens(
      user.id,
      user.email,
      false,
      permissions,
      c.env.JWT_SECRET
    );

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.insert(refreshTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token: refreshToken,
      expiresAt,
      isRevoked: false,
      createdAt: new Date().toISOString(),
    });

    return c.json({ accessToken, refreshToken });

  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});
// ─── POST /auth/refresh ───────────────────────────────────────────────────────
authRouter.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json();

  if (!refreshToken) return c.json({ error: "Refresh token required" }, 400);

  const db = createDb(c.env.DATABASE_URL);

  // Verify token signature
  let payload: any;
  try {
payload = await verify(refreshToken, c.env.JWT_SECRET, "HS256");
  } catch {
    return c.json({ error: "Invalid refresh token" }, 401);
  }

  if (payload.type !== "refresh") {
    return c.json({ error: "Invalid token type" }, 401);
  }

  // Check token in database
  const result = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken));

  const storedToken = result[0];

  if (!storedToken) return c.json({ error: "Token not found" }, 401);
  if (storedToken.isRevoked) return c.json({ error: "Token revoked" }, 401);
  if (new Date(storedToken.expiresAt) < new Date()) {
    return c.json({ error: "Token expired" }, 401);
  }

  const userId = payload.sub as string;
  const isSuperAdmin = userId === "super-admin";

  let email = c.env.SUPER_ADMIN_EMAIL;
  let permissions: string[] = [];

  if (!isSuperAdmin) {
    const userResult = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, userId));

    const user = userResult[0];
    if (!user) return c.json({ error: "User not found" }, 401);
    if (!user.isActive) return c.json({ error: "Account deactivated" }, 403);

    email = user.email;
    permissions = await getUserPermissions(userId, db);
  }

  // Revoke old refresh token
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.token, refreshToken));

  // Issue new tokens
  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
    userId,
    email,
    isSuperAdmin,
    permissions,
    c.env.JWT_SECRET
  );

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    userId,
    token: newRefreshToken,
    expiresAt,
    isRevoked: false,
    createdAt: new Date().toISOString(),
  });

  return c.json({ accessToken, refreshToken: newRefreshToken });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
authRouter.post("/logout", async (c) => {
  const { refreshToken } = await c.req.json();

  if (!refreshToken) return c.json({ error: "Refresh token required" }, 400);

  const db = createDb(c.env.DATABASE_URL);

  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.token, refreshToken));

  return c.json({ message: "Logged out successfully" });
});