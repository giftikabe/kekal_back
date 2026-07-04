import { pgTable, text, index } from "drizzle-orm/pg-core";
import { roles } from "./roles";

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    entity: text("entity").notNull(),
    action: text("action", { enum: ["create", "read", "update", "delete"] }).notNull(),
  },
  (table) => ({
    roleIdIdx: index("role_permissions_role_id_idx").on(table.roleId),
  }),
);
