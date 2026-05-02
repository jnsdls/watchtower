import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInMemoryHubDatabase, type HubDatabase } from "../db/client";
import {
  createJob,
  createProject,
  createRun,
  listEventsForRun,
} from "../db/queries";
import { applyDatabaseSchema } from "../db/setup";
import { EventBatchValidationError, ingestEventBatch } from "./index";

describe("Event ingestion", () => {
  let db: HubDatabase;
  let runId: string;

  beforeEach(async () => {
    db = createInMemoryHubDatabase();
    await applyDatabaseSchema(db);

    const project = await createProject(db, {
      localPath: "/tmp/watchtower",
      displayName: "watchtower",
    });
    const job = await createJob(db, {
      projectId: project.id,
      startedAt: new Date("2026-05-02T20:00:00.000Z"),
      status: "running",
    });
    const run = await createRun(db, {
      jobId: job.id,
      name: "implementer",
      agentProvider: "codex",
      sandboxProvider: "docker",
      startedAt: new Date("2026-05-02T20:01:00.000Z"),
      status: "running",
      configSnapshot: {},
    });

    runId = run.id;
  });

  afterEach(async () => {
    await db.$client.close();
  });

  it("stamps monotonic sequence numbers across batches", async () => {
    const timestamp = new Date("2026-05-02T20:02:00.000Z");

    await ingestEventBatch(db, {
      events: [
        { runId, type: "text", payload: { text: "one" }, timestamp },
        { runId, type: "text", payload: { text: "two" }, timestamp },
      ],
    });
    const secondBatch = await ingestEventBatch(db, {
      events: [
        { runId, type: "status", payload: { status: "running" }, timestamp },
      ],
    });

    expect(secondBatch.events).toMatchObject([{ sequenceNumber: 3 }]);
    await expect(listEventsForRun(db, runId)).resolves.toMatchObject([
      { sequenceNumber: 1 },
      { sequenceNumber: 2 },
      { sequenceNumber: 3 },
    ]);
  });

  it("dedups events with duplicate sequence numbers", async () => {
    const timestamp = new Date("2026-05-02T20:02:00.000Z");

    const first = await ingestEventBatch(db, {
      events: [
        {
          sequenceNumber: 12,
          runId,
          type: "text",
          payload: { text: "one" },
          timestamp,
        },
      ],
    });
    const duplicate = await ingestEventBatch(db, {
      events: [
        {
          sequenceNumber: 12,
          runId,
          type: "text",
          payload: { text: "retry" },
          timestamp,
        },
      ],
    });

    expect(first.events).toHaveLength(1);
    expect(duplicate.events).toHaveLength(0);
    await expect(listEventsForRun(db, runId)).resolves.toMatchObject([
      { sequenceNumber: 12, payload: { text: "one" } },
    ]);
  });

  it("fails the whole batch loudly on validation errors", async () => {
    await expect(
      ingestEventBatch(db, {
        events: [
          {
            runId,
            type: "text",
            payload: { text: "valid" },
            timestamp: "2026-05-02T20:02:00.000Z",
          },
          {
            runId: "not-a-uuid",
            type: "text",
            payload: { text: "invalid" },
            timestamp: "2026-05-02T20:02:00.000Z",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(EventBatchValidationError);

    await expect(listEventsForRun(db, runId)).resolves.toHaveLength(0);
  });

  it("rolls back the whole batch when persistence fails", async () => {
    await expect(
      ingestEventBatch(db, {
        events: [
          {
            runId,
            type: "text",
            payload: { text: "valid" },
            timestamp: "2026-05-02T20:02:00.000Z",
          },
          {
            runId: "00000000-0000-4000-8000-000000000000",
            type: "text",
            payload: { text: "missing Run" },
            timestamp: "2026-05-02T20:02:00.000Z",
          },
        ],
      }),
    ).rejects.toThrow();

    await expect(listEventsForRun(db, runId)).resolves.toHaveLength(0);
  });
});
