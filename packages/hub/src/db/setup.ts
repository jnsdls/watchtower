import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { HubDatabase } from "./client";

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "drizzle",
);

export const applyDatabaseMigrations = async (db: HubDatabase) => {
  await migrate(db, { migrationsFolder });
};
