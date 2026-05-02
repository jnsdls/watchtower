import { describe, expect, it } from "vitest";
import { createCancelCoordinator } from "./cancel-coordinator";

describe("cancel-coordinator", () => {
  it("resolves awaiters when cancellation was already requested", async () => {
    const coordinator = createCancelCoordinator();

    expect(coordinator.requestCancel("run-1")).toBe(true);

    await expect(coordinator.awaitCancel("run-1")).resolves.toEqual({
      runId: "run-1",
    });
  });

  it("resolves an awaiter when cancellation is requested later", async () => {
    const coordinator = createCancelCoordinator();
    const awaited = coordinator.awaitCancel("run-1");

    coordinator.requestCancel("run-1");

    await expect(awaited).resolves.toEqual({ runId: "run-1" });
  });

  it("resolves multiple concurrent awaiters for the same Run", async () => {
    const coordinator = createCancelCoordinator();
    const first = coordinator.awaitCancel("run-1");
    const second = coordinator.awaitCancel("run-1");

    coordinator.requestCancel("run-1");

    await expect(Promise.all([first, second])).resolves.toEqual([
      { runId: "run-1" },
      { runId: "run-1" },
    ]);
  });

  it("treats cancellation after a Run completes as a no-op", async () => {
    const coordinator = createCancelCoordinator();
    coordinator.completeRun("run-1");

    expect(coordinator.requestCancel("run-1")).toBe(false);
  });

  it("rejects an awaiter when its signal aborts", async () => {
    const coordinator = createCancelCoordinator();
    const controller = new AbortController();
    const awaited = coordinator.awaitCancel("run-1", controller.signal);

    controller.abort("client disconnected");

    await expect(awaited).rejects.toBe("client disconnected");
  });
});
