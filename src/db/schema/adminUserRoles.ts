import { pgTable, text, index } from "drizzle-orm/pg-core";
import { adminUsers } from "./adminUsers";
import { roles } from "./roles";

export const adminUserRoles = pgTable(
  "admin_user_roles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIdx: index("admin_user_roles_user_id_idx").on(table.userId),
    roleIdIdx: index("admin_user_roles_role_id_idx").on(table.roleId),
  }),
);
