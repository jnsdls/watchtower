import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInMemoryHubDatabase, type HubDatabase } from "../db/client";
import {
  createEvent,
  createJob,
  createProject,
  createRun,
} from "../db/queries";
import { applyDatabaseMigrations } from "../db/setup";
import {
  createEventBroadcaster,
  createSseEventStream,
  sseHeaders,
} from "./index";

const readChunk = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
  const chunk = await reader.read();

  if (chunk.done) {
    return "";
  }

  return new TextDecoder().decode(chunk.value);
};

const readChunks = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  count: number,
) => {
  const chunks: string[] = [];

  for (let index = 0; index < count; index += 1) {
    chunks.push(await readChunk(reader));
  }

  return chunks.join("");
};

describe("SSE stream", () => {
  let db: HubDatabase;
  let runId: string;

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

  it("back-fills exactly the Events after Last-Event-ID", async () => {
    const timestamp = new Date("2026-05-02T20:02:00.000Z");

    await createEvent(db, {
      sequenceNumber: 1,
      runId,
      type: "text",
      payload: { text: "seen" },
      timestamp,
    });
    await createEvent(db, {
      sequenceNumber: 2,
      runId,
      type: "text",
      payload: { text: "missed one" },
      timestamp,
    });
    await createEvent(db, {
      sequenceNumber: 3,
      runId,
      type: "text",
      payload: { text: "missed two" },
      timestamp,
    });

    const stream = createSseEventStream({
      broadcaster: createEventBroadcaster(),
      db,
      lastEventId: "1",
    });
    const reader = stream.getReader();
    const body = await readChunks(reader, 2);

    await reader.cancel();

    expect(body).not.toContain("id: 1\n");
    expect(body).toContain("id: 2\n");
    expect(body).toContain("missed one");
    expect(body).toContain("id: 3\n");
    expect(body).toContain("missed two");
  });

  it("closes cleanly instead of growing without bound under high live Event volume", async () => {
    const broadcaster = createEventBroadcaster();
    const stream = createSseEventStream({
      broadcaster,
      db,
      highWaterMark: 1,
      lastEventId: null,
      maxQueuedEvents: 2,
    });
    const reader = stream.getReader();
    const timestamp = new Date("2026-05-02T20:02:00.000Z");

    for (const sequenceNumber of [1, 2, 3, 4, 5]) {
      const event = await createEvent(db, {
        sequenceNumber,
        runId,
        type: "text",
        payload: { text: `event ${sequenceNumber}` },
        timestamp,
      });

      if (!event) {
        throw new Error("Expected Event insert");
      }

      expect(() => broadcaster.publish([event])).not.toThrow();
    }

    const body = await readChunk(reader);
    const closed = await reader.read();

    expect(body).toContain("event 1");
    expect(closed.done).toBe(true);
  });

  it("sets EventSource-compatible response headers", () => {
    expect(Object.fromEntries(sseHeaders)).toMatchObject({
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
    });
  });

  it("emits a `tick` Event when the broadcaster pulses (lifecycle telemetry)", async () => {
    // Seed one Event so reading its backfill chunk also acts as a
    // synchronization point — by the time we get the chunk, start()
    // has finished and the pulse subscription is live.
    await createEvent(db, {
      sequenceNumber: 1,
      runId,
      type: "text",
      payload: { text: "seed" },
      timestamp: new Date("2026-05-02T20:02:00.000Z"),
    });

    const broadcaster = createEventBroadcaster();
    const stream = createSseEventStream({
      broadcaster,
      db,
      lastEventId: null,
    });
    const reader = stream.getReader();

    const seedChunk = await readChunk(reader);
    expect(seedChunk).toContain("seed");

    broadcaster.pulse();
    const tickChunk = await readChunk(reader);

    await reader.cancel();

    // A pulse must produce an SSE `tick` event with no `id:` line so that
    // Last-Event-ID resume continues to track only real Events.
    expect(tickChunk).toContain("event: tick");
    expect(tickChunk).not.toMatch(/^id:/m);
  });
});
