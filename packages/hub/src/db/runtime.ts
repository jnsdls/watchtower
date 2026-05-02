import { createHubDatabase, type HubDatabase } from "./client";
import { applyDatabaseMigrations } from "./setup";

let databasePromise: Promise<HubDatabase> | undefined;

export const getHubDatabase = async () => {
  databasePromise ??= (async () => {
    const db = createHubDatabase();
    await applyDatabaseMigrations(db);
    return db;
  })();

  return databasePromise;
};
