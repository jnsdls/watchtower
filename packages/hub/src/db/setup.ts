import { join } from "node:path";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { HubDatabase } from "./client";

const migrationsFolder = join(import.meta.dirname, "..", "..", "drizzle");

export const applyDatabaseMigrations = async (db: HubDatabase) => {
  await migrate(db, { migrationsFolder });
};
