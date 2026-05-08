import { eq } from "drizzle-orm";
import type { HubDatabase, HubTransaction } from "../db/client";
import { createEvent, listRunsForJob } from "../db/queries";
import { jobs, runs } from "../db/schema";
import { recomputeTaskStatus } from "../task-status";

export type ReconcileReason = "job-ended" | "runner-process-dead";

const reasonMessage: Record<ReconcileReason, string> = {
  "job-ended": "Job ended before Run reported completion",
  "runner-process-dead": "Runner process exited before Run reported completion",
};

// Marks every Run still in `running` status under `jobId` as `failed`,
// records a synthetic `status` Event on each so the timeline reflects the
// transition, and recomputes Task status for any linked Tasks. Idempotent —
// no-op when nothing is in flight.
export const reconcileRunningRunsForJob = async (
  tx: HubTransaction,
  args: { jobId: string; endedAt: Date; reason: ReconcileReason },
): Promise<{ runIds: string[] }> => {
  const jobRuns = await listRunsForJob(tx, args.jobId);
  const stillRunning = jobRuns.filter((run) => run.status === "running");

  if (stillRunning.length === 0) {
    return { runIds: [] };
  }

  const message = reasonMessage[args.reason];
  const affectedTaskIds = new Set<string>();

  for (const run of stillRunning) {
    await tx
      .update(runs)
      .set({
        status: "failed",
        endedAt: args.endedAt,
        errorMessage: run.errorMessage ?? message,
      })
      .where(eq(runs.id, run.id));

    await createEvent(tx, {
      runId: run.id,
      type: "status",
      payload: { status: "failed", reason: args.reason },
      timestamp: args.endedAt,
    });

    if (run.taskId) {
      affectedTaskIds.add(run.taskId);
    }
  }

  for (const taskId of affectedTaskIds) {
    await recomputeTaskStatus(tx, taskId);
  }

  return { runIds: stillRunning.map((run) => run.id) };
};

export type ProcessAliveCheck = (pid: number) => boolean;

// V1 assumes Local deployment (Hub and Runner on the same host), so PID
// liveness against the local process table is sufficient. Hybrid/Cloud
// deployments will need a heartbeat-based liveness signal instead.
//
// Caveat: PIDs can be reused after a host reboot; a stale `running` Job
// whose PID happens to match an unrelated live process will be left in
// place until the next sweep catches it via a different signal.
export const isLocalProcessAlive: ProcessAliveCheck = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    // EPERM means the process exists but we can't signal it. Treat as
    // alive — false positives (leaving a Job `running` for one extra
    // sweep) are safer than mistakenly failing an active Job.
    if (code === "EPERM") return true;
    throw error;
  }
};

// Idempotent boot-time sweep that recovers from two failure modes:
//   (a) Jobs marked `running` whose recorded `processPid` is no longer
//       alive — the Runner crashed without sending `job.completed`. Mark
//       the Job `failed` and reconcile its child Runs.
//   (b) Jobs already in a terminal status with `running` Runs underneath —
//       runners that exited before sending `run.completed`, or historical
//       data from before the live `job.completed` reconciliation existed.
//       Reconcile just the Runs; leave the Job alone.
export const sweepStaleRuntimeJobs = async (
  db: HubDatabase,
  options: {
    now: Date;
    isProcessAlive?: ProcessAliveCheck;
  },
): Promise<{ reconciledJobs: string[]; reconciledRuns: string[] }> => {
  const isAlive = options.isProcessAlive ?? isLocalProcessAlive;

  return db.transaction(async (tx) => {
    const reconciledJobs: string[] = [];
    const reconciledRuns: string[] = [];

    const allJobs = await tx.select().from(jobs);

    for (const job of allJobs) {
      const isRunnerDead =
        job.status === "running" &&
        job.processPid !== null &&
        !isAlive(job.processPid);
      const isJobTerminal = job.status !== "running";

      if (!isRunnerDead && !isJobTerminal) continue;

      const reason: ReconcileReason = isRunnerDead
        ? "runner-process-dead"
        : "job-ended";
      const endedAt = isRunnerDead ? options.now : (job.endedAt ?? options.now);

      const { runIds } = await reconcileRunningRunsForJob(tx, {
        jobId: job.id,
        endedAt,
        reason,
      });

      if (isRunnerDead) {
        await tx
          .update(jobs)
          .set({ status: "failed", endedAt: options.now })
          .where(eq(jobs.id, job.id));
        reconciledJobs.push(job.id);
      }

      if (runIds.length > 0) {
        reconciledRuns.push(...runIds);
      }
    }

    return { reconciledJobs, reconciledRuns };
  });
};
