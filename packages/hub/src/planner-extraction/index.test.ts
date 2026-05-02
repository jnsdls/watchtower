import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryHubDatabase, type HubDatabase } from "../db/client";
import {
  createJob,
  createProject,
  getRun,
  listTasksForJob,
} from "../db/queries";
import { applyDatabaseMigrations } from "../db/setup";
import { ingestEventBatch } from "../ingestion";

describe("planner-extraction", () => {
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

  it("persists Tasks from planner output and links subsequent Runs by TASK_ID", async () => {
    const plannerRunId = "00000000-0000-4000-8000-000000000010";
    const implementerRunId = "00000000-0000-4000-8000-000000000011";

    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: plannerRunId,
          jobId,
          name: "planner",
          agentProvider: "claudeCode",
          agentModel: "claude-opus-4-6",
          sandboxProvider: "docker",
          branch: null,
          maxIterations: 3,
          configSnapshot: {},
          timestamp: "2026-05-02T20:01:00.000Z",
        },
        {
          type: "planner.output",
          runId: plannerRunId,
          stdout:
            '<plan>{"issues":[{"id":"10","title":"Planner extraction","branch":"sandcastle/issue-10-planner-extraction"},{"id":"11","title":"Gantt","branch":"sandcastle/issue-11-gantt"}]}</plan>',
          timestamp: "2026-05-02T20:02:00.000Z",
        },
        {
          type: "run.started",
          runId: implementerRunId,
          jobId,
          name: "implementer",
          agentProvider: "codex",
          agentModel: "gpt-5.5",
          sandboxProvider: "docker",
          branch: "sandcastle/issue-10-planner-extraction",
          maxIterations: 3,
          configSnapshot: {
            options: { promptArgs: { TASK_ID: "10" } },
          },
          timestamp: "2026-05-02T20:03:00.000Z",
        },
      ],
    });

    const tasks = await listTasksForJob(db, jobId);
    expect(tasks).toMatchObject([
      {
        externalId: "10",
        title: "Planner extraction",
        branch: "sandcastle/issue-10-planner-extraction",
        status: "pending",
      },
      {
        externalId: "11",
        title: "Gantt",
        branch: "sandcastle/issue-11-gantt",
        status: "pending",
      },
    ]);
    await expect(getRun(db, implementerRunId)).resolves.toMatchObject({
      taskId: tasks[0]?.id,
    });
  });

  it("logs malformed planner output without persisting Tasks", async () => {
    const logger = { error: vi.fn() };
    const plannerRunId = "00000000-0000-4000-8000-000000000012";

    await ingestEventBatch(
      db,
      {
        events: [
          {
            type: "run.started",
            runId: plannerRunId,
            jobId,
            name: "planner",
            agentProvider: "claudeCode",
            agentModel: null,
            sandboxProvider: "docker",
            branch: null,
            maxIterations: null,
            configSnapshot: {},
            timestamp: "2026-05-02T20:01:00.000Z",
          },
          {
            type: "planner.output",
            runId: plannerRunId,
            stdout: "<plan>{not json}</plan>",
            timestamp: "2026-05-02T20:02:00.000Z",
          },
        ],
      },
      { logger },
    );

    await expect(listTasksForJob(db, jobId)).resolves.toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to extract Tasks"),
    );
  });

  it("keeps non-planner Jobs as flat Runs with zero Tasks", async () => {
    await ingestEventBatch(db, {
      events: [
        {
          type: "run.started",
          runId: "00000000-0000-4000-8000-000000000013",
          jobId,
          name: "worker",
          agentProvider: "codex",
          agentModel: "gpt-5.5",
          sandboxProvider: "docker",
          branch: null,
          maxIterations: null,
          configSnapshot: {},
          timestamp: "2026-05-02T20:01:00.000Z",
        },
      ],
    });

    await expect(listTasksForJob(db, jobId)).resolves.toEqual([]);
  });
});
