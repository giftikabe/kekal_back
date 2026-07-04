import { Hono } from "hono";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createDb } from "../../db/index";
import { adminUsers } from "../../db/schema/adminUsers";
import { adminUserRoles } from "../../db/schema/adminUserRoles";
import { userPermissions } from "../../db/schema/userPermissions";
import { roles } from "../../db/schema/roles";
import { rolePermissions } from "../../db/schema/rolePermissions";
import { authMiddleware } from "../../middleware/auth";

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;
};

type Variables = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

export const adminUsersRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

// ─── Super admin only middleware ──────────────────────────────────────────────
const superAdminOnly = async (c: any, next: any) => {
  if (!c.get("isSuperAdmin")) {
    return c.json({ error: "Super admin only" }, 403);
  }
  return next();
};

const permissionSchema = z.object({
  entity: z.string().min(1),
  action: z.enum(["create", "read", "update", "delete"]),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
  roleId: z.string().optional(),
  permissions: z.array(permissionSchema).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

// ─── Roles ────────────────────────────────────────────────────────────────────
adminUsersRouter.get("/roles", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(roles));
});

adminUsersRouter.post("/roles", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const parsed = roleSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "name and description are required" }, 400);

  const record = {
    id: crypto.randomUUID(),
    ...parsed.data,
    createdAt: new Date().toISOString(),
  };
  await db.insert(roles).values(record);
  return c.json(record, 201);
});

adminUsersRouter.patch("/roles/:id", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const id = c.req.param("id");
  const parsed = roleSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  await db.update(roles).set(parsed.data).where(eq(roles.id, id));
  return c.json({ success: true });
});

adminUsersRouter.delete("/roles/:id", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const id = c.req.param("id");
  await db.delete(roles).where(eq(roles.id, id));
  return c.json({ success: true });
});

// ─── Role permissions ─────────────────────────────────────────────────────────
adminUsersRouter.get("/roles/:roleId/permissions", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const roleId = c.req.param("roleId");
  return c.json(await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId)));
});

adminUsersRouter.post("/roles/:roleId/permissions", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const roleId = c.req.param("roleId");
  const parsed = permissionSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "entity and a valid action are required" }, 400);

  const record = { id: crypto.randomUUID(), roleId, ...parsed.data };
  await db.insert(rolePermissions).values(record);
  return c.json(record, 201);
});

adminUsersRouter.delete(
  "/roles/:roleId/permissions/:permissionId",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const permissionId = c.req.param("permissionId");
    await db.delete(rolePermissions).where(eq(rolePermissions.id, permissionId));
    return c.json({ success: true });
  },
);

// ─── Users ────────────────────────────────────────────────────────────────────
adminUsersRouter.get("/", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      isActive: adminUsers.isActive,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers);
  return c.json(result);
});

adminUsersRouter.post("/", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const parsed = createUserSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, 400);
  }
  const { email, password, name, roleId, permissions } = parsed.data;

  // Friendlier duplicate-email response instead of letting the DB's unique
  // constraint bubble up as a generic error.
  const existing = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
  if (existing[0]) {
    return c.json({ error: "A user with this email already exists" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();

  await db.insert(adminUsers).values({
    id: userId,
    email,
    passwordHash,
    name,
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  if (roleId) {
    await db.insert(adminUserRoles).values({
      id: crypto.randomUUID(),
      userId,
      roleId,
    });
  }

  if (permissions && permissions.length > 0) {
    for (const perm of permissions) {
      await db.insert(userPermissions).values({
        id: crypto.randomUUID(),
        userId,
        entity: perm.entity,
        action: perm.action,
      });
    }
  }

  return c.json({ id: userId, email, name }, 201);
});

adminUsersRouter.patch("/:id", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const id = c.req.param("id");
  const parsed = updateUserSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);
  const { name, isActive, password } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password !== undefined) updates.passwordHash = await bcrypt.hash(password, 10);

  await db.update(adminUsers).set(updates).where(eq(adminUsers.id, id));
  return c.json({ success: true });
});

adminUsersRouter.delete("/:id", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const id = c.req.param("id");
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  return c.json({ success: true });
});

// ─── User direct permissions ──────────────────────────────────────────────────
adminUsersRouter.get("/:userId/permissions", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.req.param("userId");
  return c.json(await db.select().from(userPermissions).where(eq(userPermissions.userId, userId)));
});

adminUsersRouter.post("/:userId/permissions", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.req.param("userId");
  const parsed = permissionSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "entity and a valid action are required" }, 400);

  const record = { id: crypto.randomUUID(), userId, ...parsed.data };
  await db.insert(userPermissions).values(record);
  return c.json(record, 201);
});

adminUsersRouter.delete(
  "/:userId/permissions/:permissionId",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const permissionId = c.req.param("permissionId");
    await db.delete(userPermissions).where(eq(userPermissions.id, permissionId));
    return c.json({ success: true });
  },
);

// ─── Change own password (super admin or regular admin) ───────────────────────
adminUsersRouter.patch("/me/password", authMiddleware, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.get("userId");
  const isSuperAdmin = c.get("isSuperAdmin");

  const parsed = changePasswordSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, 400);
  }
  const { currentPassword, newPassword } = parsed.data;

  const result = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
  const user = result[0];
  if (!user) return c.json({ error: "User not found" }, 404);

  if (isSuperAdmin) {
    const matchesDb = await bcrypt.compare(currentPassword, user.passwordHash);
    const matchesEnv = currentPassword === c.env.SUPER_ADMIN_PASSWORD;
    if (!matchesDb && !matchesEnv) {
      return c.json({ error: "Current password is incorrect" }, 401);
    }
  } else {
    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) return c.json({ error: "Current password is incorrect" }, 401);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await db.update(adminUsers).set({ passwordHash: newPasswordHash }).where(eq(adminUsers.id, userId));

  return c.json({ success: true });
});
