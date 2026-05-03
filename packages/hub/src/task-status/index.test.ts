import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInMemoryHubDatabase, type HubDatabase } from "../db/client";
import {
  createJob,
  createProject,
  getJob,
  getRun,
  listTasksForJob,
} from "../db/queries";
import { applyDatabaseMigrations } from "../db/setup";
import { ingestEventBatch } from "../ingestion";
import { backfillOrphanRunLinkages } from "./index";

const PLAN_STDOUT =
  '<plan>{"issues":[{"id":"42","title":"Wire reviewer linkage","branch":"sandcastle/issue-42-reviewer"}]}</plan>';

const TASK_BRANCH = "sandcastle/issue-42-reviewer";

const ID = (suffix: string) => `00000000-0000-4000-8000-0000000000${suffix}`;

describe("Task & Job status derivation through ingestion", () => {
  let db: HubDatabase;
  let jobId: string;

  beforeEach(async () => {
    db = createInMemoryHubDatabase();
    await applyDatabaseMigrations(db);

    const project = await createProject(db, {
      localPath: "/tmp/watchtower",
      displayName: "watchtower",
    });
    const job = await createJob(db, {
      projectId: project.id,
      startedAt: new Date("2026-05-02T20:00:00.000Z"),
      status: "running",
    });
    jobId = job.id;

    // Plant the Task via planner extraction. The planner Run is left
    // *uncompleted* so individual tests can decide whether a successful
    // Run exists in the Job (which matters for Job-status derivation).
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("01"),
          jobId,
          name: "planner",
          agentProvider: "claudeCode",
          sandboxProvider: "docker",
          configSnapshot: {},
          timestamp: "2026-05-02T20:00:30.000Z",
        },
        {
          type: "planner.output",
          runId: ID("01"),
          stdout: PLAN_STDOUT,
          timestamp: "2026-05-02T20:00:45.000Z",
        },
      ],
    });
  });

  const completePlanner = async (status: "succeeded" | "failed") => {
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.completed",
          runId: ID("01"),
          status,
          timestamp: "2026-05-02T20:00:50.000Z",
        },
      ],
    });
  };

  afterEach(async () => {
    await db.$client.close();
  });

  const onlyTask = async () => {
    const tasks = await listTasksForJob(db, jobId);
    const task = tasks[0];
    if (!task) {
      throw new Error("Expected planted Task");
    }
    return task;
  };

  it("links a Run to a Task by matching branch when TASK_ID is absent", async () => {
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("02"),
          jobId,
          name: "reviewer",
          agentProvider: "claudeCode",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          // No TASK_ID promptArg — branch is the only signal.
          configSnapshot: { options: { promptArgs: { BRANCH: TASK_BRANCH } } },
          timestamp: "2026-05-02T20:01:00.000Z",
        },
      ],
    });

    const task = await onlyTask();
    const reviewer = await getRun(db, ID("02"));
    expect(reviewer?.taskId).toBe(task.id);
    expect(task.status).toBe("in_progress");
  });

  it("explicit TASK_ID wins over branch when both are present", async () => {
    // Task externalId is "42" — Run carries TASK_ID="42" but a different branch.
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("03"),
          jobId,
          name: "implementer",
          agentProvider: "codex",
          sandboxProvider: "docker",
          branch: "sandcastle/some-other-branch",
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "42" } },
          },
          timestamp: "2026-05-02T20:01:00.000Z",
        },
      ],
    });

    const task = await onlyTask();
    const run = await getRun(db, ID("03"));
    expect(run?.taskId).toBe(task.id);
  });

  it("aggregates implementer + reviewer succeeded → succeeded", async () => {
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("10"),
          jobId,
          name: "implementer",
          agentProvider: "codex",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "42" } },
          },
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "run.completed",
          runId: ID("10"),
          status: "succeeded",
          timestamp: "2026-05-02T20:05:00.000Z",
        },
        {
          type: "run.started",
          runId: ID("11"),
          jobId,
          name: "reviewer",
          agentProvider: "claudeCode",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {},
          timestamp: "2026-05-02T20:06:00.000Z",
        },
        {
          type: "run.completed",
          runId: ID("11"),
          status: "succeeded",
          timestamp: "2026-05-02T20:08:00.000Z",
        },
      ],
    });

    const task = await onlyTask();
    expect(task.status).toBe("succeeded");
    expect(task.failureCount).toBe(0);
  });

  it("flips to failed and increments failureCount when a linked Run fails", async () => {
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("20"),
          jobId,
          name: "implementer",
          agentProvider: "codex",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "42" } },
          },
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "run.completed",
          runId: ID("20"),
          status: "succeeded",
          timestamp: "2026-05-02T20:05:00.000Z",
        },
        {
          type: "run.started",
          runId: ID("21"),
          jobId,
          name: "reviewer",
          agentProvider: "claudeCode",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {},
          timestamp: "2026-05-02T20:06:00.000Z",
        },
        {
          type: "run.completed",
          runId: ID("21"),
          status: "failed",
          timestamp: "2026-05-02T20:08:00.000Z",
        },
      ],
    });

    const task = await onlyTask();
    expect(task.status).toBe("failed");
    expect(task.failureCount).toBe(1);
  });

  it("treats failed as non-sticky: a new attempt after a gap resets status while preserving failureCount", async () => {
    // Attempt 1: reviewer fails → status="failed", failureCount=1
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("30"),
          jobId,
          name: "reviewer",
          agentProvider: "claudeCode",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {},
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "run.completed",
          runId: ID("30"),
          status: "failed",
          timestamp: "2026-05-02T20:02:00.000Z",
        },
      ],
    });
    let task = await onlyTask();
    expect(task.status).toBe("failed");
    expect(task.failureCount).toBe(1);

    // Attempt 2 starts after a gap: status flips back to in_progress.
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("31"),
          jobId,
          name: "implementer",
          agentProvider: "codex",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "42" } },
          },
          timestamp: "2026-05-02T20:30:00.000Z",
        },
      ],
    });
    task = await onlyTask();
    expect(task.status).toBe("in_progress");
    expect(task.failureCount).toBe(1);

    // Attempt 2 succeeds: status flips to succeeded; failureCount sticks at 1.
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.completed",
          runId: ID("31"),
          status: "succeeded",
          timestamp: "2026-05-02T20:35:00.000Z",
        },
      ],
    });
    task = await onlyTask();
    expect(task.status).toBe("succeeded");
    expect(task.failureCount).toBe(1);
  });

  it("Job derivation: succeeded if any Run succeeded, regardless of CLI-sent status", async () => {
    await completePlanner("succeeded");
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("40"),
          jobId,
          name: "implementer",
          agentProvider: "codex",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "42" } },
          },
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "run.completed",
          runId: ID("40"),
          status: "failed",
          timestamp: "2026-05-02T20:05:00.000Z",
        },
        // CLI insists the Job failed (orchestration crash). Hub overrides:
        // the planner succeeded, so the Job did produce something.
        {
          type: "job.completed",
          jobId,
          status: "failed",
          timestamp: "2026-05-02T20:06:00.000Z",
        },
      ],
    });

    const job = await getJob(db, jobId);
    expect(job?.status).toBe("succeeded");
  });

  it("Backfill: links historical orphan Runs by branch and recomputes Task status", async () => {
    // Simulate the live-data shape: a reviewer Run was ingested *before* the
    // branch-fallback rule existed, so its taskId is null but its branch
    // matches the planted Task.
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("60"),
          jobId,
          name: "implementer",
          agentProvider: "codex",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "42" } },
          },
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "run.completed",
          runId: ID("60"),
          status: "succeeded",
          timestamp: "2026-05-02T20:05:00.000Z",
        },
      ],
    });
    // Manually create an orphan Run that mimics pre-fix ingestion (no TASK_ID,
    // taskId never assigned). We bypass ingestion's new branch-fallback path
    // by inserting directly with createRun.
    const { createRun } = await import("../db/queries");
    await createRun(db, {
      id: ID("61"),
      jobId,
      name: "reviewer",
      agentProvider: "claudeCode",
      sandboxProvider: "docker",
      branch: TASK_BRANCH,
      startedAt: new Date("2026-05-02T20:06:00.000Z"),
      endedAt: new Date("2026-05-02T20:08:00.000Z"),
      status: "succeeded",
      configSnapshot: {},
    });

    // Pre-backfill: reviewer is unlinked, Task status reflects only the
    // implementer.
    let task = await onlyTask();
    expect(task.status).toBe("succeeded");
    let reviewer = await getRun(db, ID("61"));
    expect(reviewer?.taskId).toBeNull();

    const result = await backfillOrphanRunLinkages(db);
    expect(result.recomputedTasks).toBe(1);

    // Post-backfill: reviewer is linked. Status remains "succeeded" since both
    // Runs succeeded — but it was *recomputed* from the new linkage set.
    reviewer = await getRun(db, ID("61"));
    expect(reviewer?.taskId).toBe(task.id);
    task = await onlyTask();
    expect(task.status).toBe("succeeded");

    // Re-running the backfill is a no-op: nothing left to link.
    const second = await backfillOrphanRunLinkages(db);
    expect(second.recomputedTasks).toBe(0);
  });

  it("Job derivation: failed when no Run succeeded, regardless of CLI-sent status", async () => {
    await completePlanner("failed");
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: ID("50"),
          jobId,
          name: "implementer",
          agentProvider: "codex",
          sandboxProvider: "docker",
          branch: TASK_BRANCH,
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "42" } },
          },
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "run.completed",
          runId: ID("50"),
          status: "failed",
          timestamp: "2026-05-02T20:05:00.000Z",
        },
        // CLI insists the Job succeeded (exit code 0). Hub overrides:
        // every Run failed, so the Job produced nothing of value.
        {
          type: "job.completed",
          jobId,
          status: "succeeded",
          timestamp: "2026-05-02T20:06:00.000Z",
        },
      ],
    });

    const job = await getJob(db, jobId);
    expect(job?.status).toBe("failed");
  });
});
