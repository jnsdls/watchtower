import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInMemoryHubDatabase, type HubDatabase } from "../db/client";
import {
  createJob,
  createProject,
  getJob,
  getRun,
  listEventsForRun,
} from "../db/queries";
import { applyDatabaseMigrations } from "../db/setup";
import { ingestEventBatch } from "./index";

describe("Runner telemetry ingestion", () => {
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
  });

  afterEach(async () => {
    await db.$client.close();
  });

  it("persists optional Job title from lifecycle Events", async () => {
    const titledJobId = "00000000-0000-4000-8000-000000000009";

    await ingestEventBatch(db, {
      events: [
        {
          type: "job.started",
          jobId: titledJobId,
          project: {
            gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
            localPath: null,
            displayName: "watchtower",
          },
          title: "fix: persist Job title",
          timestamp: "2026-05-02T20:00:00.000Z",
        },
      ],
    });

    await expect(getJob(db, titledJobId)).resolves.toMatchObject({
      title: "fix: persist Job title",
      template: null,
    });
  });

  it("continues to accept job.started without a title", async () => {
    const untitledJobId = "00000000-0000-4000-8000-000000000010";

    await ingestEventBatch(db, {
      events: [
        {
          type: "job.started",
          jobId: untitledJobId,
          project: {
            gitRemoteUrl: null,
            localPath: "/tmp/watchtower",
            displayName: "watchtower",
          },
          timestamp: "2026-05-02T20:00:00.000Z",
        },
      ],
    });

    await expect(getJob(db, untitledJobId)).resolves.toMatchObject({
      title: null,
      template: null,
    });
  });

  it("persists full Run telemetry from lifecycle Events", async () => {
    const runId = "00000000-0000-4000-8000-000000000008";

    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId,
          jobId,
          name: "implementer",
          agentProvider: "claudeCode",
          agentModel: "claude-opus-4-6",
          sandboxProvider: "docker",
          branch: "feature",
          maxIterations: 3,
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "8" } },
            capturedAt: "2026-05-02T20:01:00.000Z",
          },
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "run.event",
          runId,
          eventType: "text",
          iteration: 1,
          payload: { message: "hello" },
          timestamp: "2026-05-02T20:01:01.000Z",
        },
        {
          type: "run.completed",
          runId,
          status: "succeeded",
          branch: "feature",
          completionSignal: "<promise>COMPLETE</promise>",
          iterations: [
            {
              n: 1,
              inputTokens: 100,
              outputTokens: 25,
              cacheReadInputTokens: 10,
              cacheCreationInputTokens: 5,
              sessionId: "session-1",
              sessionFilePath: "/tmp/session.jsonl",
            },
          ],
          commits: [{ sha: "abc123" }],
          timestamp: "2026-05-02T20:02:00.000Z",
        },
        {
          type: "job.completed",
          jobId,
          status: "succeeded",
          timestamp: "2026-05-02T20:03:00.000Z",
        },
      ],
    });

    await expect(getRun(db, runId)).resolves.toMatchObject({
      agentProvider: "claudeCode",
      agentModel: "claude-opus-4-6",
      sandboxProvider: "docker",
      branch: "feature",
      maxIterations: 3,
      status: "succeeded",
      completionSignal: "<promise>COMPLETE</promise>",
      configSnapshot: {
        options: { promptArgs: { TASK_ID: "8" } },
        capturedAt: "2026-05-02T20:01:00.000Z",
      },
    });
    await expect(getJob(db, jobId)).resolves.toMatchObject({
      status: "succeeded",
      endedAt: new Date("2026-05-02T20:03:00.000Z"),
    });
    await expect(listEventsForRun(db, runId)).resolves.toMatchObject([
      {
        type: "text",
        payload: { message: "hello" },
      },
    ]);
  });

  it("reconciles still-running Runs to failed when their Job completes without run.completed", async () => {
    const orphanRunId = "00000000-0000-4000-8000-000000000011";

    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: orphanRunId,
          jobId,
          name: "implementer",
          agentProvider: "codex",
          sandboxProvider: "docker",
          configSnapshot: {},
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "job.completed",
          jobId,
          status: "succeeded",
          timestamp: "2026-05-02T20:03:00.000Z",
        },
      ],
    });

    await expect(getRun(db, orphanRunId)).resolves.toMatchObject({
      status: "failed",
      endedAt: new Date("2026-05-02T20:03:00.000Z"),
      errorMessage: "Job ended before Run reported completion",
    });
    // No succeeded Run inside, so the Job itself flips to failed.
    await expect(getJob(db, jobId)).resolves.toMatchObject({
      status: "failed",
      endedAt: new Date("2026-05-02T20:03:00.000Z"),
    });
    await expect(listEventsForRun(db, orphanRunId)).resolves.toMatchObject([
      {
        type: "status",
        payload: { status: "failed", reason: "job-ended" },
      },
    ]);
  });
});
