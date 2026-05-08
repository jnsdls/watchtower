import { describe, expect, it } from "vitest";
import { claudeModelRates, costForRun } from "./rates";

const baseRun = {
  agentProvider: "claudeCode",
  agentModel: "claude-sonnet-4-5",
};

const iteration = {
  inputTokens: 1_000_000,
  outputTokens: 100_000,
  cacheReadInputTokens: 500_000,
  cacheCreationInputTokens: 200_000,
};

describe("costForRun", () => {
  it("computes USD cost for a known Claude model", () => {
    expect(costForRun(baseRun, [iteration])).toBe(5.4);
  });

  it("returns null for unknown model, non-Claude provider, and zero iterations", () => {
    expect(
      costForRun({ ...baseRun, agentModel: "claude-mystery-9-9" }, [iteration]),
    ).toBeNull();
    expect(
      costForRun(
        { ...baseRun, agentProvider: "codex", agentModel: "gpt-5.5" },
        [iteration],
      ),
    ).toBeNull();
    expect(costForRun(baseRun, [])).toBeNull();
  });

  it("sums mixed iteration token totals", () => {
    expect(
      costForRun(baseRun, [
        {
          inputTokens: 100_000,
          outputTokens: 10_000,
          cacheReadInputTokens: null,
          cacheCreationInputTokens: null,
        },
        {
          inputTokens: null,
          outputTokens: 5_000,
          cacheReadInputTokens: 20_000,
          cacheCreationInputTokens: 8_000,
        },
      ]),
    ).toBeCloseTo(0.561);
  });

  it("applies cache-read and cache-creation multipliers in model rates", () => {
    expect(claudeModelRates["claude-sonnet-4-6"]).toMatchObject({
      inputPerMTok: 3,
      cacheReadPerMTok: 0.3,
      cacheCreationPerMTok: 3.75,
    });
    expect(claudeModelRates["claude-haiku-4-5"]).toMatchObject({
      inputPerMTok: 1,
      cacheReadPerMTok: 0.1,
      cacheCreationPerMTok: 1.25,
    });
    expect(claudeModelRates["claude-opus-4-7"]).toMatchObject({
      inputPerMTok: 5,
      cacheReadPerMTok: 0.5,
      cacheCreationPerMTok: 6.25,
    });
  });
});
