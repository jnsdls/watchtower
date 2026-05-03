import type { HubDatabase, HubQueryDatabase } from "../db/client";
import {
  findTaskForJobByBranch,
  incrementTaskFailureCount,
  listOrphanRunsWithBranch,
  listRunsForTask,
  setRunTaskId,
  updateTaskStatus,
} from "../db/queries";
import { deriveTaskStatusFromRuns } from "./derive";

export type { DerivedTaskStatus, RunForTaskStatus } from "./derive";
export { deriveTaskStatusFromRuns } from "./derive";

export const recomputeTaskStatus = async (
  db: HubQueryDatabase,
  taskId: string,
) => {
  const linkedRuns = await listRunsForTask(db, taskId);
  const status = deriveTaskStatusFromRuns(linkedRuns);
  await updateTaskStatus(db, { id: taskId, status });
};

export const recordRunFailureForTask = async (
  db: HubQueryDatabase,
  taskId: string,
) => {
  await incrementTaskFailureCount(db, taskId);
};

// Idempotent sweep: link any historical Runs that were ingested before the
// branch-fallback rule existed (e.g. reviewer Runs whose promptArgs lacked
// TASK_ID). Runs the same lookup the live ingestion path now uses, so a
// no-op once everything is already linked.
export const backfillOrphanRunLinkages = async (
  db: HubDatabase,
): Promise<{ linkedRuns: number; recomputedTasks: number }> =>
  db.transaction(async (tx) => {
    const orphans = await listOrphanRunsWithBranch(tx);
    const affectedTaskIds = new Set<string>();

    for (const run of orphans) {
      if (!run.branch) continue;
      const task = await findTaskForJobByBranch(tx, run.jobId, run.branch);
      if (!task) continue;
      await setRunTaskId(tx, { runId: run.id, taskId: task.id });
      affectedTaskIds.add(task.id);
    }

    for (const taskId of affectedTaskIds) {
      await recomputeTaskStatus(tx, taskId);
    }

    return {
      linkedRuns: affectedTaskIds.size > 0 ? orphans.length : 0,
      recomputedTasks: affectedTaskIds.size,
    };
  });
