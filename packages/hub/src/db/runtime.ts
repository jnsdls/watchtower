import { backfillOrphanRunLinkages } from "../task-status";
import { createHubDatabase, type HubDatabase } from "./client";
import { applyDatabaseMigrations } from "./setup";

let databasePromise: Promise<HubDatabase> | undefined;

export const getHubDatabase = async () => {
  databasePromise ??= (async () => {
    const db = createHubDatabase();
    await applyDatabaseMigrations(db);
    // One-shot at boot: link any Runs that were ingested before the
    // branch-fallback linkage rule existed (e.g. reviewer Runs missing
    // TASK_ID). Idempotent — no-op once everything is linked.
    await backfillOrphanRunLinkages(db);
    return db;
  })();

  return databasePromise;
};
