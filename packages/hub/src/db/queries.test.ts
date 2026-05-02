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
  listIterationsForRun,
  listJobsForProjectSummary,
  listProjectsByRecentActivity,
  listRuns,
  listRunsForJob,
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
    await expect(listIterationsForRun(db, run.id)).resolves.toMatchObject([
      { id: iteration.id, n: 1 },
    ]);
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

  it("reads Dashboard summaries in recency and timeline order", async () => {
    const older = new Date("2030-05-02T20:00:00.000Z");
    const newer = new Date("2030-05-02T21:00:00.000Z");
    const ended = new Date("2030-05-02T21:07:00.000Z");
    const quietProject = await createProject(db, {
      localPath: "/tmp/quiet",
      displayName: "quiet",
    });
    const activeProject = await createProject(db, {
      gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
      displayName: "watchtower",
    });
    const activeJob = await createJob(db, {
      projectId: activeProject.id,
      startedAt: newer,
      endedAt: ended,
      status: "completed",
    });
    const staleJob = await createJob(db, {
      projectId: activeProject.id,
      startedAt: older,
      status: "running",
    });
    const staleRun = await createRun(db, {
      jobId: staleJob.id,
      name: "implementer",
      agentProvider: "codex",
      agentModel: "gpt-5.5",
      sandboxProvider: "docker",
      startedAt: older,
      status: "running",
      configSnapshot: {},
    });
    const claudeRun = await createRun(db, {
      jobId: activeJob.id,
      name: "reviewer",
      agentProvider: "claudeCode",
      agentModel: "claude-opus-4-6",
      sandboxProvider: "docker",
      startedAt: newer,
      endedAt: ended,
      status: "completed",
      configSnapshot: {},
    });
    await createIteration(db, {
      runId: claudeRun.id,
      n: 1,
      startedAt: newer,
      endedAt: ended,
      inputTokens: 100,
      outputTokens: 25,
      cacheReadInputTokens: 10,
      cacheCreationInputTokens: 5,
    });
    await createEvent(db, {
      sequenceNumber: 2,
      runId: claudeRun.id,
      type: "toolCall",
      payload: { name: "Bash", formattedArgs: "bun test" },
      timestamp: ended,
    });
    await createEvent(db, {
      sequenceNumber: 1,
      runId: claudeRun.id,
      type: "text",
      payload: { message: "checking" },
      timestamp: newer,
    });

    await expect(listProjectsByRecentActivity(db)).resolves.toMatchObject([
      {
        id: activeProject.id,
        displayName: "watchtower",
        latestActivityAt: newer,
        jobCount: 2,
        runCount: 2,
      },
      {
        id: quietProject.id,
        displayName: "quiet",
        latestActivityAt: quietProject.createdAt,
        jobCount: 0,
        runCount: 0,
      },
    ]);
    await expect(
      listJobsForProjectSummary(db, activeProject.id),
    ).resolves.toMatchObject([
      {
        id: activeJob.id,
        status: "completed",
        runCount: 1,
        totalTokens: 140,
      },
      {
        id: staleJob.id,
        status: "running",
        runCount: 1,
        totalTokens: null,
      },
    ]);
    await expect(listRunsForJob(db, staleJob.id)).resolves.toMatchObject([
      {
        id: staleRun.id,
        status: "running",
        agentProvider: "codex",
        agentModel: "gpt-5.5",
        sandboxProvider: "docker",
      },
    ]);
    await expect(listEventsForRun(db, claudeRun.id)).resolves.toMatchObject([
      { sequenceNumber: 1, type: "text" },
      { sequenceNumber: 2, type: "toolCall" },
    ]);
  });
});
