import { describe, expect, it, vi } from "vitest";
import { createWatchtowerHubClient } from "./hub-client";

describe("hub-client", () => {
  it("posts lifecycle telemetry in order and batches stream Events", async () => {
    const bodies: unknown[] = [];
    const fetch = vi.fn(async (_url: URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    });
    const client = createWatchtowerHubClient({
      fetch,
      hubUrl: "http://127.0.0.1:7777",
      jobId: "00000000-0000-4000-8000-000000000001",
      retryDelaysMs: [1],
    });

    await client.registerRunStart({
      abortController: new AbortController(),
      configSnapshot: {},
      name: "worker",
      optionsKeys: [],
      telemetry: {
        agentProvider: "codex",
        agentModel: "gpt-5.5",
        sandboxProvider: "docker",
        branch: null,
        maxIterations: 2,
      },
    });
    client.recordRunEvent("00000000-0000-4000-8000-000000000002", {
      type: "text",
      message: "one",
      iteration: 1,
      timestamp: "2026-05-02T20:00:00.000Z",
    });
    client.recordRunEvent("00000000-0000-4000-8000-000000000002", {
      type: "toolCall",
      name: "Bash",
      formattedArgs: "bun test",
      iteration: 1,
      timestamp: "2026-05-02T20:00:01.000Z",
    });
    await client.flush();
    await client.recordRunComplete({
      runId: "00000000-0000-4000-8000-000000000002",
      result: {
        branch: "main",
        commits: [{ sha: "abc123" }],
        completionSignal: "<promise>COMPLETE</promise>",
        iterations: [{ usage: { inputTokens: 1, outputTokens: 2 } }],
        stdout: "done",
      },
    });
    await client.recordPlannerOutput(
      "00000000-0000-4000-8000-000000000002",
      '<plan>{"issues":[]}</plan>',
    );
    await client.flush();

    expect(
      bodies.flatMap((body) =>
        Array.isArray((body as { events?: unknown[] }).events)
          ? (body as { events: { type: string }[] }).events.map(
              (event) => event.type,
            )
          : [],
      ),
    ).toEqual([
      "run.started",
      "run.event",
      "run.event",
      "run.completed",
      "planner.output",
    ]);
  });

  it("retries dropped telemetry without throwing to the Runner", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 201 }),
      );
    const client = createWatchtowerHubClient({
      fetch,
      hubUrl: "http://127.0.0.1:7777",
      jobId: "00000000-0000-4000-8000-000000000001",
      retryDelaysMs: [0],
    });

    client.recordRunEvent("00000000-0000-4000-8000-000000000002", {
      type: "text",
      message: "one",
      iteration: 1,
      timestamp: "2026-05-02T20:00:00.000Z",
    });
    await client.flush();

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
