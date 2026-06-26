import { Hono } from "hono";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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

// ─── Roles ────────────────────────────────────────────────────────────────────
adminUsersRouter.get("/roles", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  return c.json(await db.select().from(roles));
});

adminUsersRouter.post("/roles", authMiddleware, superAdminOnly, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const record = {
    id: crypto.randomUUID(),
    ...body,
    createdAt: new Date().toISOString(),
  };
  await db.insert(roles).values(record);
  return c.json(record, 201);
});

adminUsersRouter.patch(
  "/roles/:id",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const id = c.req.param("id");
    const body = await c.req.json();
    await db.update(roles).set(body).where(eq(roles.id, id));
    return c.json({ success: true });
  },
);

adminUsersRouter.delete(
  "/roles/:id",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const id = c.req.param("id");
    await db.delete(roles).where(eq(roles.id, id));
    return c.json({ success: true });
  },
);

// ─── Role permissions ─────────────────────────────────────────────────────────
adminUsersRouter.get(
  "/roles/:roleId/permissions",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const roleId = c.req.param("roleId");
    return c.json(
      await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId)),
    );
  },
);

adminUsersRouter.post(
  "/roles/:roleId/permissions",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const roleId = c.req.param("roleId");
    const body = await c.req.json();
    const record = { id: crypto.randomUUID(), roleId, ...body };
    await db.insert(rolePermissions).values(record);
    return c.json(record, 201);
  },
);

adminUsersRouter.delete(
  "/roles/:roleId/permissions/:permissionId",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const permissionId = c.req.param("permissionId");
    await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.id, permissionId));
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
  const { email, password, name, roleId, permissions } = await c.req.json();

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

  // Assign role if provided
  if (roleId) {
    await db.insert(adminUserRoles).values({
      id: crypto.randomUUID(),
      userId,
      roleId,
    });
  }

  // Assign direct permissions if provided
  if (permissions && Array.isArray(permissions)) {
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
  const { name, isActive, password } = await c.req.json();

  const updates: any = {};
  if (name) updates.name = name;
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

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
adminUsersRouter.get(
  "/:userId/permissions",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const userId = c.req.param("userId");
    return c.json(
      await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId)),
    );
  },
);

adminUsersRouter.post(
  "/:userId/permissions",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const record = { id: crypto.randomUUID(), userId, ...body };
    await db.insert(userPermissions).values(record);
    return c.json(record, 201);
  },
);

adminUsersRouter.delete(
  "/:userId/permissions/:permissionId",
  authMiddleware,
  superAdminOnly,
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const permissionId = c.req.param("permissionId");
    await db
      .delete(userPermissions)
      .where(eq(userPermissions.id, permissionId));
    return c.json({ success: true });
  },
);



// ─── Super admin change own password ─────────────────────────────────────────
adminUsersRouter.patch("/me/password", authMiddleware, async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.get("userId");
  const isSuperAdmin = c.get("isSuperAdmin");

  const { currentPassword, newPassword } = await c.req.json();

  if (!currentPassword || !newPassword) {
    return c.json({ error: "Current and new password are required" }, 400);
  }

  const result = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, userId));

  const user = result[0];

  if (!user) return c.json({ error: "User not found" }, 404);

  // For super admin verify against DB first, fallback to env
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
  await db
    .update(adminUsers)
    .set({ passwordHash: newPasswordHash })
    .where(eq(adminUsers.id, userId));

  return c.json({ success: true });
});