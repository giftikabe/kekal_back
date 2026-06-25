import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { adminUsers } from "./adminUsers";

export const refreshTokens = pgTable("refresh_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: text("created_at").notNull(),
});