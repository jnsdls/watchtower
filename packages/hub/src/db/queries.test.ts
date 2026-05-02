import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInMemoryHubDatabase, type HubDatabase } from "./client";
import {
  createCommit,
  createEvent,
  createIteration,
  createJob,
  createProject,
  createRun,
  createTask,
  getCommit,
  getIteration,
  getJob,
  getProject,
  getRun,
  getTask,
  listEventsForRun,
  listRuns,
} from "./queries";
import { applyDatabaseMigrations } from "./setup";

describe("Hub db queries", () => {
  let db: HubDatabase;

  beforeEach(async () => {
    db = createInMemoryHubDatabase();
    await applyDatabaseMigrations(db);
  });

  afterEach(async () => {
    await db.$client.close();
  });

  it("writes and reads every V1 entity through typed query functions", async () => {
    const startedAt = new Date("2026-05-02T20:00:00.000Z");
    const project = await createProject(db, {
      gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
      displayName: "watchtower",
    });
    const job = await createJob(db, {
      projectId: project.id,
      startedAt,
      status: "running",
      processPid: 1234,
      watchtowerVersion: "0.0.0",
    });
    const task = await createTask(db, {
      jobId: job.id,
      externalId: "4",
      title: "Hub skeleton",
      branch: "sandcastle/issue-4-hub-drizzle-pglite-ingestion",
      status: "implementing",
    });
    const run = await createRun(db, {
      jobId: job.id,
      taskId: task.id,
      name: "implementer",
      agentProvider: "codex",
      agentModel: "gpt-5.5",
      sandboxProvider: "docker",
      branch: task.branch,
      maxIterations: 10,
      startedAt,
      status: "running",
      configSnapshot: { promptArgs: { TASK_ID: "4" } },
    });
    const iteration = await createIteration(db, {
      runId: run.id,
      n: 1,
      startedAt,
      inputTokens: null,
      outputTokens: null,
    });
    const event = await createEvent(db, {
      sequenceNumber: 1,
      runId: run.id,
      iterationId: iteration.id,
      type: "text",
      payload: { text: "hello" },
      timestamp: startedAt,
    });
    const commit = await createCommit(db, {
      runId: run.id,
      sha: "abc123",
    });

    await expect(getProject(db, project.id)).resolves.toMatchObject({
      displayName: "watchtower",
    });
    await expect(getJob(db, job.id)).resolves.toMatchObject({
      projectId: project.id,
      status: "running",
    });
    await expect(getTask(db, task.id)).resolves.toMatchObject({
      externalId: "4",
    });
    await expect(getRun(db, run.id)).resolves.toMatchObject({
      taskId: task.id,
      configSnapshot: { promptArgs: { TASK_ID: "4" } },
    });
    await expect(getIteration(db, iteration.id)).resolves.toMatchObject({
      n: 1,
      inputTokens: null,
    });
    await expect(listEventsForRun(db, run.id)).resolves.toMatchObject([
      {
        id: event?.id,
        sequenceNumber: 1,
        payload: { text: "hello" },
      },
    ]);
    await expect(getCommit(db, commit.id)).resolves.toMatchObject({
      sha: "abc123",
    });
    await expect(listRuns(db)).resolves.toHaveLength(1);
  });
});
