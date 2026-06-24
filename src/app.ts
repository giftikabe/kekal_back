import { Hono } from "hono";

import { sql } from "drizzle-orm";

import { db } from "./db/index.js";

export const app = new Hono();

app.get("/", async (c) => {
  try {
    const result = await db.execute(
      sql`SELECT NOW()`,
    );

    return c.json({
      status: "connected",
      result,
    });
  } catch (error) {
    return c.json({
      status: "failed",
      error: String(error),
    });
  }
});