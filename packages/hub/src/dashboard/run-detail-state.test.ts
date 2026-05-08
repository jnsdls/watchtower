import { describe, expect, it } from "vitest";
import {
  autoScrollStateAfterScroll,
  buildRunDetailState,
} from "./run-detail-state";

const runId = "00000000-0000-4000-8000-000000000003";
const startedAt = new Date("2026-05-02T20:00:00.000Z");
const endedAt = new Date("2026-05-02T20:03:05.000Z");

describe("Run detail state", () => {
  it("derives iteration status and Turns from the Event stream", () => {
    const firstIterationId = "00000000-0000-4000-8000-000000000006";
    const secondIterationId = "00000000-0000-4000-8000-000000000007";
    const state = buildRunDetailState({
      activeIterationNumber: 2,
      events: [
        {
          id: "00000000-0000-4000-8000-000000000008",
          sequenceNumber: 1,
          runId,
          iterationId: firstIterationId,
          type: "text",
          payload: { message: "first try" },
          timestamp: startedAt,
        },
        {
          id: "00000000-0000-4000-8000-000000000009",
          sequenceNumber: 2,
          runId,
          iterationId: firstIterationId,
          type: "toolCall",
          payload: { name: "Bash", formattedArgs: "bun test" },
          timestamp: new Date("2026-05-02T20:01:00.000Z"),
        },
        {
          id: "00000000-0000-4000-8000-000000000010",
          sequenceNumber: 3,
          runId,
          iterationId: secondIterationId,
          type: "text",
          payload: { message: "repair" },
          timestamp: new Date("2026-05-02T20:02:00.000Z"),
        },
        {
          id: "00000000-0000-4000-8000-000000000011",
          sequenceNumber: 4,
          runId,
          iterationId: secondIterationId,
          type: "text",
          payload: { message: "verify" },
          timestamp: endedAt,
        },
      ],
      iterations: [
        {
          id: firstIterationId,
          runId,
          n: 1,
          startedAt,
          endedAt: new Date("2026-05-02T20:01:30.000Z"),
          inputTokens: 100,
          outputTokens: 25,
          cacheReadInputTokens: 10,
          cacheCreationInputTokens: 5,
          sessionId: null,
          sessionFilePath: null,
        },
        {
          id: secondIterationId,
          runId,
          n: 2,
          startedAt: new Date("2026-05-02T20:02:00.000Z"),
          endedAt,
          inputTokens: 200,
          outputTokens: 50,
          cacheReadInputTokens: 20,
          cacheCreationInputTokens: 10,
          sessionId: null,
          sessionFilePath: null,
        },
      ],
      run: {
        id: runId,
        jobId: "00000000-0000-4000-8000-000000000002",
        taskId: null,
        name: "planner",
        agentProvider: "claudeCode",
        agentModel: "claude-opus-4-6",
        sandboxProvider: "docker",
        branch: null,
        maxIterations: 2,
        startedAt,
        endedAt,
        status: "succeeded",
        cancelRequested: false,
        completionSignal: null,
        configSnapshot: {},
        errorMessage: null,
      },
    });

    expect(state.iterations.map((iteration) => iteration.status)).toEqual([
      "failed",
      "succeeded",
    ]);
    expect(state.iterations.map((iteration) => iteration.turnCount)).toEqual([
      1, 2,
    ]);
    expect(state.activeIteration.n).toBe(2);
    expect(state.turns.map((turn) => turn.n)).toEqual([1, 2]);
    expect(state.turns[0]?.events.map((event) => event.sequenceNumber)).toEqual(
      [3],
    );
    expect(state.turns[1]?.events.map((event) => event.sequenceNumber)).toEqual(
      [4],
    );
  });

  it("defaults one-shot Runs to iteration 1 and hides switcher data", () => {
    const state = buildRunDetailState({
      events: [
        {
          id: "00000000-0000-4000-8000-000000000008",
          sequenceNumber: 1,
          runId,
          iterationId: null,
          type: "text",
          payload: { message: "checking status" },
          timestamp: startedAt,
        },
      ],
      iterations: [],
      run: {
        id: runId,
        jobId: "00000000-0000-4000-8000-000000000002",
        taskId: null,
        name: "implementer",
        agentProvider: "codex",
        agentModel: "gpt-5.5",
        sandboxProvider: "docker",
        branch: null,
        maxIterations: 1,
        startedAt,
        endedAt: null,
        status: "running",
        cancelRequested: false,
        completionSignal: null,
        configSnapshot: {},
        errorMessage: null,
      },
    });

    expect(state.iterations).toHaveLength(1);
    expect(state.iterations[0]).toMatchObject({
      n: 1,
      status: "running",
      turnCount: 1,
    });
    expect(state.isMultiIteration).toBe(false);
  });

  it("keeps the active Iteration open while the Run is running", () => {
    const eventTimestamp = new Date("2026-05-02T20:01:00.000Z");
    const state = buildRunDetailState({
      events: [
        {
          id: "00000000-0000-4000-8000-000000000008",
          sequenceNumber: 1,
          runId,
          iterationId: null,
          type: "text",
          payload: { message: "still working" },
          timestamp: eventTimestamp,
        },
      ],
      iterations: [],
      run: {
        id: runId,
        jobId: "00000000-0000-4000-8000-000000000002",
        taskId: null,
        name: "implementer",
        agentProvider: "codex",
        agentModel: "gpt-5.5",
        sandboxProvider: "docker",
        branch: null,
        maxIterations: 1,
        startedAt,
        endedAt: null,
        status: "running",
        cancelRequested: false,
        completionSignal: null,
        configSnapshot: {},
        errorMessage: null,
      },
    });

    expect(state.activeIteration.endedAt).toBeNull();
  });

  it("pauses auto-scroll when the user scrolls away from the bottom", () => {
    expect(
      autoScrollStateAfterScroll({
        enabled: true,
        scrollHeight: 1_000,
        scrollTop: 450,
        clientHeight: 400,
      }),
    ).toEqual({ enabled: false, paused: true });

    expect(
      autoScrollStateAfterScroll({
        enabled: false,
        scrollHeight: 1_000,
        scrollTop: 598,
        clientHeight: 400,
      }),
    ).toEqual({ enabled: true, paused: false });
  });
});
