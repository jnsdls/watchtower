import { sweepStaleRuntimeJobs } from "../run-reconciliation";
import { backfillOrphanRunLinkages } from "../task-status";
import { createHubDatabase, type HubDatabase } from "./client";
import { applyDatabaseMigrations } from "./setup";

// Pinned to globalThis so Next dev / Turbopack HMR module re-evaluation
// reuses the same PGlite connection. Without this, every reloaded module
// graph creates its own connection against the same pgdata dir, and each
// instance keeps a divergent in-memory view — writes posted via one route
// become invisible to pages rendered through another.
const globalKey = Symbol.for("watchtower.hub.databasePromise");
type GlobalWithDatabase = typeof globalThis & {
  [globalKey]?: Promise<HubDatabase>;
};
const globalScope = globalThis as GlobalWithDatabase;

export const getHubDatabase = async () => {
  globalScope[globalKey] ??= (async () => {
    const db = createHubDatabase();
    await applyDatabaseMigrations(db);
    // One-shot at boot: link any Runs that were ingested before the
    // branch-fallback linkage rule existed (e.g. reviewer Runs missing
    // TASK_ID). Idempotent — no-op once everything is linked.
    await backfillOrphanRunLinkages(db);
    // Recover Jobs whose Runner crashed without sending `job.completed`,
    // and reconcile any historical orphan Runs left in `running` status
    // under already-terminal Jobs.
    await sweepStaleRuntimeJobs(db, { now: new Date() });
    return db;
  })();

  return globalScope[globalKey];
};
