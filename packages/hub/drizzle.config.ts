import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

const watchtowerHome =
  process.env.WATCHTOWER_HOME ?? join(homedir(), ".watchtower");

mkdirSync(watchtowerHome, { recursive: true });

export default defineConfig({
  dialect: "postgresql",
  driver: "pglite",
  dbCredentials: {
    url: `${watchtowerHome}/pgdata`,
  },
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  strict: true,
  verbose: true,
});
