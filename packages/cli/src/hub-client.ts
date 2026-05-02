import { randomUUID } from "node:crypto";
import packageJson from "../../../package.json" with { type: "json" };
import type {
  HubClient,
  RunCanceled,
  RunComplete,
  RunFailed,
  RunStart,
  SandcastleRunResult,
} from "./wrapper.ts";

type Fetch = (input: URL, init?: RequestInit) => Promise<Response>;

type TelemetryEvent =
  | {
      readonly type: "job.started";
      readonly jobId: string;
      readonly project: {
        readonly gitRemoteUrl: string | null;
        readonly localPath: string | null;
        readonly displayName: string;
      };
      readonly processPid: number | null;
      readonly watchtowerVersion: string | null;
      readonly timestamp: string;
    }
  | {
      readonly type: "job.completed";
      readonly jobId: string;
      readonly status: string;
      readonly timestamp: string;
    }
  | {
      readonly type: "run.started";
      readonly runId: string;
      readonly jobId: string;
      readonly name: string;
      readonly agentProvider: string;
      readonly agentModel: string | null;
      readonly sandboxProvider: string;
      readonly branch: string | null;
      readonly maxIterations: number | null;
      readonly configSnapshot: unknown;
      readonly timestamp: string;
    }
  | {
      readonly type: "run.event";
      readonly runId: string;
      readonly eventType: string;
      readonly iteration: number | null;
      readonly payload: Record<string, unknown>;
      readonly timestamp: string;
    }
  | {
      readonly type: "run.completed";
      readonly runId: string;
      readonly status: string;
      readonly branch: string | null;
      readonly completionSignal: string | null;
      readonly iterations: readonly Record<string, unknown>[];
      readonly commits: readonly { readonly sha: string }[];
      readonly errorMessage?: string | null;
      readonly timestamp: string;
    }
  | {
      readonly type: "planner.output";
      readonly runId: string;
      readonly stdout: string;
      readonly timestamp: string;
    };

export type WatchtowerHubClientOptions = {
  readonly hubUrl: string;
  readonly jobId: string;
  readonly fetch?: Fetch;
  readonly batchWindowMs?: number;
  readonly retryDelaysMs?: readonly number[];
};

export type StartWatchtowerJobOptions = {
  readonly hubUrl: string;
  readonly project: {
    readonly gitRemoteUrl: string | null;
    readonly localPath: string | null;
    readonly displayName: string;
  };
  readonly fetch?: Fetch;
};

const defaultRetryDelaysMs = [100, 250, 500, 1_000, 2_000];

const sleep = (ms: number) =>
  new Promise<void>((resolveSleep) => setTimeout(resolveSleep, ms));

export const postTelemetryEvents = async (
  hubUrl: string,
  events: readonly TelemetryEvent[],
  fetchImplementation: Fetch = fetch,
) => {
  const response = await fetchImplementation(new URL("/api/events", hubUrl), {
    body: JSON.stringify({ events }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Hub returned HTTP ${response.status}`);
  }
};

export const startWatchtowerJob = async ({
  fetch: fetchImplementation,
  hubUrl,
  project,
}: StartWatchtowerJobOptions) => {
  const jobId = randomUUID();
  await postTelemetryEvents(
    hubUrl,
    [
      {
        type: "job.started",
        jobId,
        project,
        processPid: process.pid,
        watchtowerVersion: packageJson.version,
        timestamp: new Date().toISOString(),
      },
    ],
    fetchImplementation,
  );
  return jobId;
};

export const completeWatchtowerJob = async (
  hubUrl: string,
  jobId: string,
  exitCode: number,
  status?: string,
) => {
  await postTelemetryEvents(hubUrl, [
    {
      type: "job.completed",
      jobId,
      status: status ?? (exitCode === 0 ? "succeeded" : "failed"),
      timestamp: new Date().toISOString(),
    },
  ]);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeAgentProvider = (name: string | null) =>
  name === "claude-code" ? "claudeCode" : (name ?? "unknown");

const getString = (value: unknown, key: string) =>
  isRecord(value) && typeof value[key] === "string" ? value[key] : null;

const getNumber = (value: unknown, key: string) =>
  isRecord(value) && typeof value[key] === "number" ? value[key] : null;

const extractModelFromCommand = (
  provider: unknown,
  prompt = "watchtower model probe",
) => {
  if (!isRecord(provider) || typeof provider.buildPrintCommand !== "function") {
    return null;
  }

  try {
    const command = provider.buildPrintCommand({
      dangerouslySkipPermissions: true,
      prompt,
    });
    const commandText = getString(command, "command");
    return commandText?.match(/(?:--model|-m)\s+'?([^'\s]+)'?/)?.[1] ?? null;
  } catch {
    return null;
  }
};

export const extractRunTelemetry = (start: RunStart) => {
  const options = isRecord(start.originalOptions) ? start.originalOptions : {};
  const agent = options.agent;
  const sandboxOptions = isRecord(start.sandboxOptions)
    ? start.sandboxOptions
    : {};
  const sandbox = options.sandbox ?? sandboxOptions.sandbox;
  const branch =
    getString(options.branchStrategy, "branch") ??
    getString(start.sandboxOptions, "branch") ??
    null;

  return {
    agentProvider: normalizeAgentProvider(getString(agent, "name")),
    agentModel: extractModelFromCommand(agent),
    sandboxProvider: getString(sandbox, "name") ?? "unknown",
    branch,
    maxIterations: getNumber(options, "maxIterations"),
  };
};

const normalizeStreamEvent = (
  event: unknown,
): Omit<Extract<TelemetryEvent, { type: "run.event" }>, "runId"> => {
  if (!isRecord(event)) {
    return {
      eventType: "unknown",
      iteration: null,
      payload: { value: event },
      timestamp: new Date().toISOString(),
      type: "run.event",
    };
  }

  const timestamp =
    event.timestamp instanceof Date
      ? event.timestamp.toISOString()
      : typeof event.timestamp === "string"
        ? event.timestamp
        : new Date().toISOString();
  const eventType = typeof event.type === "string" ? event.type : "unknown";

  return {
    eventType,
    iteration: typeof event.iteration === "number" ? event.iteration : null,
    payload: { ...event, timestamp },
    timestamp,
    type: "run.event",
  };
};

const normalizeIterations = (result: SandcastleRunResult) => {
  const iterations = Array.isArray(result.iterations) ? result.iterations : [];

  return iterations.map((iteration, index) => {
    const usage = isRecord(iteration) ? iteration.usage : undefined;

    return {
      n: index + 1,
      inputTokens: getNumber(usage, "inputTokens"),
      outputTokens: getNumber(usage, "outputTokens"),
      cacheReadInputTokens: getNumber(usage, "cacheReadInputTokens"),
      cacheCreationInputTokens: getNumber(usage, "cacheCreationInputTokens"),
      sessionId: getString(iteration, "sessionId"),
      sessionFilePath: getString(iteration, "sessionFilePath"),
    };
  });
};

const normalizeCommits = (result: SandcastleRunResult) =>
  (Array.isArray(result.commits) ? result.commits : [])
    .map((commit) => ({ sha: getString(commit, "sha") }))
    .filter((commit): commit is { sha: string } => commit.sha !== null);

const formatErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

export const createWatchtowerHubClient = ({
  batchWindowMs = 100,
  fetch: fetchImplementation = fetch,
  hubUrl,
  jobId,
  retryDelaysMs = defaultRetryDelaysMs,
}: WatchtowerHubClientOptions): HubClient & { flush: () => Promise<void> } => {
  let queue: TelemetryEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelPolls = new Map<string, AbortController>();

  const post = async (events: readonly TelemetryEvent[]) => {
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
      try {
        await postTelemetryEvents(hubUrl, events, fetchImplementation);
        return;
      } catch {
        const delay = retryDelaysMs[attempt];

        if (delay === undefined) {
          return;
        }

        await sleep(delay);
      }
    }
  };

  const flush = async () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    if (queue.length === 0) {
      return;
    }

    const events = queue;
    queue = [];
    await post(events);
  };

  const enqueue = (event: TelemetryEvent) => {
    queue.push(event);

    if (timer === undefined) {
      timer = setTimeout(() => {
        void flush();
      }, batchWindowMs);
    }
  };

  const stopCancelPoll = (runId: string) => {
    const poll = cancelPolls.get(runId);
    cancelPolls.delete(runId);
    poll?.abort();
  };

  const watchRunCancel = async (
    runId: string,
    abortController: AbortController,
  ) => {
    stopCancelPoll(runId);

    const pollController = new AbortController();
    cancelPolls.set(runId, pollController);

    const poll = async () => {
      while (
        !abortController.signal.aborted &&
        !pollController.signal.aborted
      ) {
        try {
          const response = await fetchImplementation(
            new URL(`/api/runs/${runId}/cancel`, hubUrl),
            { method: "GET", signal: pollController.signal },
          );

          if (response.status === 204) {
            continue;
          }

          if (response.ok) {
            abortController.abort("Dashboard cancel requested");
            return;
          }
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }
        }

        await sleep(250);
      }
    };

    void poll();
  };

  return {
    flush,
    registerRunStart: async (start) => {
      const runId = randomUUID();
      const telemetry = start.telemetry ?? extractRunTelemetry(start);
      await post([
        {
          type: "run.started",
          runId,
          jobId,
          name: start.name ?? "unnamed",
          agentProvider: telemetry.agentProvider,
          agentModel: telemetry.agentModel,
          sandboxProvider: telemetry.sandboxProvider,
          branch: telemetry.branch,
          maxIterations: telemetry.maxIterations,
          configSnapshot: start.configSnapshot,
          timestamp: new Date().toISOString(),
        },
      ]);
      return runId;
    },
    recordPlannerOutput: async (runId, stdout) => {
      await post([
        {
          type: "planner.output",
          runId,
          stdout,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    recordRunComplete: async (complete: RunComplete) => {
      stopCancelPoll(complete.runId);
      await flush();
      await post([
        {
          type: "run.completed",
          runId: complete.runId,
          status: "succeeded",
          branch: getString(complete.result, "branch"),
          completionSignal: getString(complete.result, "completionSignal"),
          commits: normalizeCommits(complete.result),
          iterations: normalizeIterations(complete.result),
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    recordRunCanceled: async (canceled: RunCanceled) => {
      stopCancelPoll(canceled.runId);
      await flush();
      await post([
        {
          type: "run.completed",
          runId: canceled.runId,
          status: "canceled",
          branch: null,
          completionSignal: null,
          commits: [],
          errorMessage: null,
          iterations: [],
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    recordRunFailed: async (failed: RunFailed) => {
      stopCancelPoll(failed.runId);
      await flush();
      await post([
        {
          type: "run.completed",
          runId: failed.runId,
          status: "failed",
          branch: null,
          completionSignal: null,
          commits: [],
          errorMessage: formatErrorMessage(failed.error),
          iterations: [],
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    recordRunEvent: (runId, event) => {
      enqueue({ runId, ...normalizeStreamEvent(event) });
    },
    watchRunCancel,
  };
};
