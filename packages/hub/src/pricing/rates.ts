export type ClaudeModelRate = {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  cacheCreationPerMTok: number;
};

export type PricedRun = {
  agentProvider: string;
  agentModel: string | null;
};

export type PricedIteration = {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadInputTokens: number | null;
  cacheCreationInputTokens: number | null;
};

// Global Claude API rates, USD per 1M tokens, verified 2026-05-08.
export const claudeModelRates: Record<string, ClaudeModelRate> = {
  "claude-sonnet-4-5": {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheCreationPerMTok: 3.75,
  },
  "claude-sonnet-4-6": {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheCreationPerMTok: 3.75,
  },
  "claude-haiku-4-5": {
    inputPerMTok: 1,
    outputPerMTok: 5,
    cacheReadPerMTok: 0.1,
    cacheCreationPerMTok: 1.25,
  },
  "claude-opus-4-6": {
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheCreationPerMTok: 6.25,
  },
  "claude-opus-4-7": {
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheCreationPerMTok: 6.25,
  },
};

const costForTokens = (tokens: number | null, perMTok: number) =>
  ((tokens ?? 0) * perMTok) / 1_000_000;

export const costForRun = (
  run: PricedRun,
  iterations: PricedIteration[],
): number | null => {
  if (
    run.agentProvider !== "claudeCode" ||
    !run.agentModel ||
    iterations.length === 0
  ) {
    return null;
  }

  const rate = claudeModelRates[run.agentModel];
  if (!rate) {
    return null;
  }

  return iterations.reduce(
    (total, iteration) =>
      total +
      costForTokens(iteration.inputTokens, rate.inputPerMTok) +
      costForTokens(iteration.outputTokens, rate.outputPerMTok) +
      costForTokens(iteration.cacheReadInputTokens, rate.cacheReadPerMTok) +
      costForTokens(
        iteration.cacheCreationInputTokens,
        rate.cacheCreationPerMTok,
      ),
    0,
  );
};
