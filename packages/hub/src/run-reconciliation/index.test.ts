import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInMemoryHubDatabase, type HubDatabase } from "../db/client";
import {
  createJob,
  createProject,
  createRun,
  createTask,
  getJob,
  getRun,
  getTask,
  listEventsForRun,
} from "../db/queries";
import { applyDatabaseMigrations } from "../db/setup";
import { reconcileRunningRunsForJob, sweepStaleRuntimeJobs } from "./index";

describe("Run reconciliation", () => {
  let db: HubDatabase;

  beforeEach(async () => {
    db = createInMemoryHubDatabase();
    await applyDatabaseMigrations(db);
  });

  afterEach(async () => {
    await db.$client.close();
  });

  describe("reconcileRunningRunsForJob", () => {
    it("marks running runs as failed, records synthetic status events, and recomputes Task status", async () => {
      const startedAt = new Date("2026-05-02T20:00:00.000Z");
      const endedAt = new Date("2026-05-02T20:30:00.000Z");
      const project = await createProject(db, {
        localPath: "/tmp/watchtower",
        displayName: "watchtower",
      });
      const job = await createJob(db, {
        projectId: project.id,
        startedAt,
        status: "running",
      });
      const task = await createTask(db, {
        jobId: job.id,
        externalId: "42",
        title: "Reconcile orphans",
        branch: "sandcastle/issue-42",
        status: "in_progress",
      });
      const runningRun = await createRun(db, {
        jobId: job.id,
        taskId: task.id,
        name: "implementer",
        agentProvider: "codex",
        sandboxProvider: "docker",
        startedAt,
        status: "running",
        configSnapshot: {},
      });
      const succeededRun = await createRun(db, {
        jobId: job.id,
        taskId: task.id,
        name: "reviewer",
        agentProvider: "codex",
        sandboxProvider: "docker",
        startedAt,
        endedAt: new Date("2026-05-02T20:10:00.000Z"),
        status: "succeeded",
        configSnapshot: {},
      });

      const result = await db.transaction((tx) =>
        reconcileRunningRunsForJob(tx, {
          jobId: job.id,
          endedAt,
          reason: "job-ended",
        }),
      );

      expect(result.runIds).toEqual([runningRun.id]);
      await expect(getRun(db, runningRun.id)).resolves.toMatchObject({
        status: "failed",
        endedAt,
        errorMessage: "Job ended before Run reported completion",
      });
      // Already-terminal runs are untouched.
      await expect(getRun(db, succeededRun.id)).resolves.toMatchObject({
        status: "succeeded",
      });
      await expect(listEventsForRun(db, runningRun.id)).resolves.toMatchObject([
        {
          type: "status",
          payload: { status: "failed", reason: "job-ended" },
        },
      ]);
      // Task status reflects the new attempt (one succeeded + one failed run
      // in the same attempt → "succeeded" wins because every run in the
      // current attempt would need to fail for "failed", but actually
      // `succeeded` requires *all* runs to have succeeded — so this is
      // "failed" by deriveTaskStatusFromRuns).
      await expect(getTask(db, task.id)).resolves.toMatchObject({
        status: "failed",
      });
    });

    it("is a no-op when no runs are still running", async () => {
      const startedAt = new Date("2026-05-02T20:00:00.000Z");
      const project = await createProject(db, {
        localPath: "/tmp/watchtower",
        displayName: "watchtower",
      });
      const job = await createJob(db, {
        projectId: project.id,
        startedAt,
        status: "succeeded",
        endedAt: new Date("2026-05-02T20:10:00.000Z"),
      });
      await createRun(db, {
        jobId: job.id,
        name: "implementer",
        agentProvider: "codex",
        sandboxProvider: "docker",
        startedAt,
        endedAt: new Date("2026-05-02T20:05:00.000Z"),
        status: "succeeded",
        configSnapshot: {},
      });

      const result = await db.transaction((tx) =>
        reconcileRunningRunsForJob(tx, {
          jobId: job.id,
          endedAt: new Date("2026-05-02T20:30:00.000Z"),
          reason: "job-ended",
        }),
      );

      expect(result.runIds).toEqual([]);
    });

    it("preserves a pre-existing errorMessage instead of overwriting", async () => {
      const startedAt = new Date("2026-05-02T20:00:00.000Z");
      const endedAt = new Date("2026-05-02T20:30:00.000Z");
      const project = await createProject(db, {
        localPath: "/tmp/watchtower",
        displayName: "watchtower",
      });
      const job = await createJob(db, {
        projectId: project.id,
        startedAt,
        status: "running",
      });
      const run = await createRun(db, {
        jobId: job.id,
        name: "implementer",
        agentProvider: "codex",
        sandboxProvider: "docker",
        startedAt,
        status: "running",
        configSnapshot: {},
        errorMessage: "Sandbox build failed earlier",
      });

      await db.transaction((tx) =>
        reconcileRunningRunsForJob(tx, {
          jobId: job.id,
          endedAt,
          reason: "runner-process-dead",
        }),
      );

      await expect(getRun(db, run.id)).resolves.toMatchObject({
        status: "failed",
        endedAt,
        errorMessage: "Sandbox build failed earlier",
      });
    });
  });

  describe("sweepStaleRuntimeJobs", () => {
    it("fails Jobs whose Runner PID is dead and reconciles their child Runs", async () => {
      const startedAt = new Date("2026-05-02T20:00:00.000Z");
      const now = new Date("2026-05-02T22:00:00.000Z");
      const project = await createProject(db, {
        localPath: "/tmp/watchtower",
        displayName: "watchtower",
      });
      const job = await createJob(db, {
        projectId: project.id,
        startedAt,
        status: "running",
        processPid: 99999,
      });
      const run = await createRun(db, {
        jobId: job.id,
        name: "implementer",
        agentProvider: "codex",
        sandboxProvider: "docker",
        startedAt,
        status: "running",
        configSnapshot: {},
      });

      const result = await sweepStaleRuntimeJobs(db, {
        now,
        isProcessAlive: () => false,
      });

      expect(result.reconciledJobs).toEqual([job.id]);
      expect(result.reconciledRuns).toEqual([run.id]);
      await expect(getJob(db, job.id)).resolves.toMatchObject({
        status: "failed",
        endedAt: now,
      });
      await expect(getRun(db, run.id)).resolves.toMatchObject({
        status: "failed",
        endedAt: now,
        errorMessage: "Runner process exited before Run reported completion",
      });
    });

    it("leaves Jobs alone whose Runner PID is still alive", async () => {
      const startedAt = new Date("2026-05-02T20:00:00.000Z");
      const project = await createProject(db, {
        localPath: "/tmp/watchtower",
        displayName: "watchtower",
      });
      const job = await createJob(db, {
        projectId: project.id,
        startedAt,
        status: "running",
        processPid: 12345,
      });
      const run = await createRun(db, {
        jobId: job.id,
        name: "implementer",
        agentProvider: "codex",
        sandboxProvider: "docker",
        startedAt,
        status: "running",
        configSnapshot: {},
      });

      const result = await sweepStaleRuntimeJobs(db, {
        now: new Date("2026-05-02T22:00:00.000Z"),
        isProcessAlive: () => true,
      });

      expect(result.reconciledJobs).toEqual([]);
      expect(result.reconciledRuns).toEqual([]);
      await expect(getJob(db, job.id)).resolves.toMatchObject({
        status: "running",
      });
      await expect(getRun(db, run.id)).resolves.toMatchObject({
        status: "running",
      });
    });

    it("reconciles orphan Runs under a Job that already reached a terminal status", async () => {
      const startedAt = new Date("2026-05-02T20:00:00.000Z");
      const jobEndedAt = new Date("2026-05-02T20:10:00.000Z");
      const project = await createProject(db, {
        localPath: "/tmp/watchtower",
        displayName: "watchtower",
      });
      const job = await createJob(db, {
        projectId: project.id,
        startedAt,
        endedAt: jobEndedAt,
        status: "succeeded",
      });
      const orphan = await createRun(db, {
        jobId: job.id,
        name: "reviewer",
        agentProvider: "codex",
        sandboxProvider: "docker",
        startedAt,
        status: "running",
        configSnapshot: {},
      });

      const result = await sweepStaleRuntimeJobs(db, {
        now: new Date("2026-05-02T22:00:00.000Z"),
        isProcessAlive: () => true,
      });

      expect(result.reconciledJobs).toEqual([]);
      expect(result.reconciledRuns).toEqual([orphan.id]);
      // Job is left alone.
      await expect(getJob(db, job.id)).resolves.toMatchObject({
        status: "succeeded",
        endedAt: jobEndedAt,
      });
      // Orphan Run gets the Job's endedAt, not `now`.
      await expect(getRun(db, orphan.id)).resolves.toMatchObject({
        status: "failed",
        endedAt: jobEndedAt,
      });
    });

    it("is idempotent across repeated runs", async () => {
      const startedAt = new Date("2026-05-02T20:00:00.000Z");
      const project = await createProject(db, {
        localPath: "/tmp/watchtower",
        displayName: "watchtower",
      });
      const job = await createJob(db, {
        projectId: project.id,
        startedAt,
        status: "running",
        processPid: 99999,
      });
      await createRun(db, {
        jobId: job.id,
        name: "implementer",
        agentProvider: "codex",
        sandboxProvider: "docker",
        startedAt,
        status: "running",
        configSnapshot: {},
      });

      const first = await sweepStaleRuntimeJobs(db, {
        now: new Date("2026-05-02T22:00:00.000Z"),
        isProcessAlive: () => false,
      });
      const second = await sweepStaleRuntimeJobs(db, {
        now: new Date("2026-05-02T22:05:00.000Z"),
        isProcessAlive: () => false,
      });

      expect(first.reconciledJobs).toHaveLength(1);
      expect(first.reconciledRuns).toHaveLength(1);
      expect(second.reconciledJobs).toEqual([]);
      expect(second.reconciledRuns).toEqual([]);
    });

    it("skips running Jobs without a recorded processPid (insufficient signal)", async () => {
      const startedAt = new Date("2026-05-02T20:00:00.000Z");
      const project = await createProject(db, {
        localPath: "/tmp/watchtower",
        displayName: "watchtower",
      });
      const job = await createJob(db, {
        projectId: project.id,
        startedAt,
        status: "running",
        // processPid omitted — no liveness signal available.
      });

      const result = await sweepStaleRuntimeJobs(db, {
        now: new Date("2026-05-02T22:00:00.000Z"),
        isProcessAlive: () => false,
      });

      expect(result.reconciledJobs).toEqual([]);
      await expect(getJob(db, job.id)).resolves.toMatchObject({
        status: "running",
      });
    });
  });
});
