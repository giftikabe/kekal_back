import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Local/CLI use only (drizzle-kit push/generate). Reads from a local
    // .env file that is gitignored — see .env.example. The deployed Worker
    // itself gets DATABASE_URL from a Cloudflare secret, not from this file.
    url: process.env.DATABASE_URL!,
  },
});
