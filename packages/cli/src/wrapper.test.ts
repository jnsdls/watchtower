import { describe, expect, it } from "vitest";
import {
  type HubClient,
  type RunStart,
  type SandcastleRunOptions,
  wrapSandcastleModule,
} from "./wrapper.ts";

const createHubClient = () => {
  const starts: RunStart[] = [];
  const events: unknown[] = [];
  const completes: unknown[] = [];
  const plannerOutputs: unknown[] = [];
  const hubClient: HubClient = {
    registerRunStart: (start) => {
      starts.push(start);
      return `run-${starts.length}`;
    },
    recordRunEvent: (runId, event) => {
      events.push({ runId, event });
    },
    recordRunComplete: (complete) => {
      completes.push(complete);
    },
    recordPlannerOutput: (runId, stdout) => {
      plannerOutputs.push({ runId, stdout });
    },
  };

  return { completes, events, hubClient, plannerOutputs, starts };
};

describe("wrapper", () => {
  it("registers an AbortController and passes through run results", async () => {
    const { completes, hubClient, starts } = createHubClient();
    const realModule = {
      run: async (options: SandcastleRunOptions) => ({
        branch: "main",
        signalIsAbortSignal: options.signal instanceof AbortSignal,
        stdout: "done",
      }),
    };

    const wrapped = wrapSandcastleModule(realModule, { hubClient });

    await expect(
      wrapped.run({ agent: "fake", name: "implementer" }),
    ).resolves.toEqual({
      branch: "main",
      signalIsAbortSignal: true,
      stdout: "done",
    });

    expect(starts).toHaveLength(1);
    expect(starts[0]?.name).toBe("implementer");
    expect(starts[0]?.optionsKeys).toEqual(["agent", "name"]);
    expect(starts[0]?.abortController).toBeInstanceOf(AbortController);
    expect(completes).toEqual([
      {
        runId: "run-1",
        result: {
          branch: "main",
          signalIsAbortSignal: true,
          stdout: "done",
        },
      },
    ]);
  });

  it("forwards every agent stream Event without dropping the user's callback", async () => {
    const { events, hubClient } = createHubClient();
    const userEvents: unknown[] = [];
    const realModule = {
      run: async (options: SandcastleRunOptions) => {
        options.logging?.onAgentStreamEvent?.({ text: "one" });
        options.logging?.onAgentStreamEvent?.({ text: "two" });
        return { stdout: "done" };
      },
    };

    const wrapped = wrapSandcastleModule(realModule, { hubClient });

    await wrapped.run({
      agent: "fake",
      logging: {
        type: "file",
        onAgentStreamEvent: (event) => userEvents.push(event),
      },
      name: "worker",
    });

    expect(events).toEqual([
      { runId: "run-1", event: { text: "one" } },
      { runId: "run-1", event: { text: "two" } },
    ]);
    expect(userEvents).toEqual([{ text: "one" }, { text: "two" }]);
  });

  it("captures the config snapshot at Run start, not completion", async () => {
    const { hubClient, starts } = createHubClient();
    const runOptions: SandcastleRunOptions = {
      agent: "fake",
      mutable: { value: "start" },
      name: "worker",
    };
    const realModule = {
      run: async (_options: SandcastleRunOptions) => {
        (runOptions as { mutable: { value: string } }).mutable = {
          value: "end",
        };
        return { stdout: "done" };
      },
    };

    const wrapped = wrapSandcastleModule(realModule, { hubClient });

    await wrapped.run(runOptions);

    expect(starts[0]?.configSnapshot).toEqual({
      agent: "fake",
      mutable: { value: "start" },
      name: "worker",
    });
  });

  it("records planner output only for name planner", async () => {
    const { hubClient, plannerOutputs } = createHubClient();
    const realModule = {
      run: async (options: SandcastleRunOptions) => ({
        stdout: `<plan>${options.name}</plan>`,
      }),
    };
    const wrapped = wrapSandcastleModule(realModule, { hubClient });

    await wrapped.run({ agent: "fake", name: "planner" });
    await wrapped.run({ agent: "fake", name: "reviewer" });

    expect(plannerOutputs).toEqual([
      {
        runId: "run-1",
        stdout: "<plan>planner</plan>",
      },
    ]);
  });

  it("passes pre-aborted signals through without registering a Run", async () => {
    const { hubClient, starts } = createHubClient();
    const controller = new AbortController();
    controller.abort("already canceled");
    const realModule = {
      run: async (options: SandcastleRunOptions) => {
        options.signal?.throwIfAborted();
        return { stdout: "unreachable" };
      },
    };
    const wrapped = wrapSandcastleModule(realModule, { hubClient });

    await expect(
      wrapped.run({ agent: "fake", signal: controller.signal }),
    ).rejects.toBe("already canceled");

    expect(starts).toEqual([]);
  });

  it("wraps sandbox.run returned by createSandbox", async () => {
    const calls: unknown[] = [];
    const { hubClient, starts } = createHubClient();
    const realModule = {
      createSandbox: async (options: object) => {
        calls.push(options);
        return {
          branch: "feature",
          run: async (runOptions: SandcastleRunOptions) => ({
            name: runOptions.name,
            stdout: "sandbox done",
          }),
        };
      },
    };
    const wrappedCalls: unknown[] = [];
    const wrapped = wrapSandcastleModule(realModule, {
      hubClient,
      logCall: (call) => wrappedCalls.push(call),
    });

    const sandbox = await wrapped.createSandbox?.({ branch: "feature" });
    if (sandbox === undefined) {
      throw new Error("Expected createSandbox to return a sandbox.");
    }
    await expect(
      sandbox.run?.({ agent: "fake", name: "reviewer" }),
    ).resolves.toEqual({
      name: "reviewer",
      stdout: "sandbox done",
    });

    expect(calls).toEqual([{ branch: "feature" }]);
    expect(starts[0]?.name).toBe("reviewer");
    expect(wrappedCalls).toEqual([
      {
        functionName: "createSandbox",
        name: undefined,
        optionsKeys: ["branch"],
      },
      {
        functionName: "sandbox.run",
        name: "reviewer",
        optionsKeys: ["agent", "name"],
      },
    ]);
  });
});
