import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export function createDb(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql);
}