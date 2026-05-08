import { describe, expect, it, vi } from "vitest";

const requestJobCancel = vi.fn();
const getHubDatabase = vi.fn();
const publish = vi.fn();
const requestCancel = vi.fn();
const completeRun = vi.fn();

vi.mock("../../../../../db/queries", () => ({
  requestJobCancel,
}));

vi.mock("../../../../../db/runtime", () => ({
  getHubDatabase,
}));

vi.mock("../../../../../sse-stream", () => ({
  eventBroadcaster: { publish },
}));

vi.mock("../../../../../cancel-coordinator", () => ({
  cancelCoordinator: { requestCancel, completeRun },
}));

describe("POST /api/jobs/[jobId]/cancel", () => {
  it("cancels every running Run for a Job and returns the count", async () => {
    const db = {};
    const event = {
      id: "event-1",
      sequenceNumber: 1,
      runId: "run-1",
      iterationId: null,
      type: "status",
      payload: { status: "canceled", cancelRequested: true },
      timestamp: new Date("2026-05-02T20:02:00.000Z"),
    };
    getHubDatabase.mockResolvedValue(db);
    requestJobCancel.mockResolvedValue({
      status: "requested",
      canceledCount: 2,
      runIds: ["run-1", "run-2"],
      events: [event],
    });
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ jobId: "job-1" }),
    });

    await expect(response.json()).resolves.toEqual({
      canceledCount: 2,
      jobId: "job-1",
      status: "requested",
    });
    expect(requestJobCancel).toHaveBeenCalledWith(db, {
      id: "job-1",
      requestedAt: expect.any(Date),
    });
    expect(requestCancel).toHaveBeenCalledWith("run-1");
    expect(requestCancel).toHaveBeenCalledWith("run-2");
    expect(publish).toHaveBeenCalledWith([event]);
  });
});
