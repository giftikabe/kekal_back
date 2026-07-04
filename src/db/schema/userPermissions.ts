import { pgTable, text, index } from "drizzle-orm/pg-core";
import { adminUsers } from "./adminUsers";

export const userPermissions = pgTable(
  "user_permissions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    entity: text("entity").notNull(),
    action: text("action", { enum: ["create", "read", "update", "delete"] }).notNull(),
  },
  (table) => ({
    userIdIdx: index("user_permissions_user_id_idx").on(table.userId),
  }),
);
