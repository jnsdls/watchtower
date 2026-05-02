import { describe, expect, it, vi } from "vitest";
import { createSigintHandler } from "./signals";

describe("signals", () => {
  it("runs graceful cancellation on first SIGINT and hard exits on second", () => {
    const abortActiveRuns = vi.fn();
    const onFirstSignal = vi.fn();
    const exit = vi.fn();
    const handleSigint = createSigintHandler({
      abortActiveRuns,
      exit,
      onFirstSignal,
    });

    handleSigint();
    handleSigint();

    expect(onFirstSignal).toHaveBeenCalledTimes(1);
    expect(abortActiveRuns).toHaveBeenCalledWith("SIGINT");
    expect(exit).toHaveBeenCalledWith(130);
  });
});
