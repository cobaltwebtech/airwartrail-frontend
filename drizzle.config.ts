import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db-auth-schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
} satisfies Config;
