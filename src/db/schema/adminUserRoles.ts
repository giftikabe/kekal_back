import { pgTable, text } from "drizzle-orm/pg-core";
import { adminUsers } from "./adminUsers";
import { roles } from "./roles";

export const adminUserRoles = pgTable("admin_user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
});