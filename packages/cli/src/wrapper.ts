export type SandcastleRunOptions = {
  readonly name?: string;
  readonly logging?: {
    readonly type: string;
    readonly onAgentStreamEvent?: (event: unknown) => void;
  };
  readonly signal?: AbortSignal;
  readonly [key: string]: unknown;
};

export type SandcastleRunResult = {
  readonly stdout?: string;
  readonly [key: string]: unknown;
};

export type SandcastleSandbox = {
  readonly run?: (
    options: SandcastleRunOptions,
  ) => Promise<SandcastleRunResult>;
  readonly [key: string | symbol]: unknown;
};

export type SandcastleModule = {
  run?: (options: SandcastleRunOptions) => Promise<SandcastleRunResult>;
  createSandbox?: (options: object) => Promise<SandcastleSandbox>;
  [key: string]: unknown;
};

export type WrappedCall = {
  readonly functionName: "run" | "createSandbox" | "sandbox.run";
  readonly name: string | undefined;
  readonly optionsKeys: readonly string[];
};

export type RunStart = {
  readonly name: string | undefined;
  readonly optionsKeys: readonly string[];
  readonly configSnapshot: unknown;
  readonly abortController: AbortController;
  readonly originalOptions?: SandcastleRunOptions;
  readonly sandboxOptions?: object;
  readonly telemetry?: {
    readonly agentProvider: string;
    readonly agentModel: string | null;
    readonly sandboxProvider: string;
    readonly branch: string | null;
    readonly maxIterations: number | null;
  };
};

export type RunComplete = {
  readonly runId: string;
  readonly result: SandcastleRunResult;
};

export type RunFailed = {
  readonly runId: string;
  readonly error: unknown;
};

export type HubClient = {
  readonly registerRunStart: (start: RunStart) => string | Promise<string>;
  readonly recordRunEvent: (
    runId: string,
    event: unknown,
  ) => void | Promise<void>;
  readonly recordRunComplete: (complete: RunComplete) => void | Promise<void>;
  readonly recordRunFailed?: (failed: RunFailed) => void | Promise<void>;
  readonly recordPlannerOutput: (
    runId: string,
    stdout: string,
  ) => void | Promise<void>;
};

export type WrapSandcastleOptions = {
  readonly hubClient: HubClient;
  readonly logCall?: (call: WrappedCall) => void;
  readonly snapshotConfig?: (options: object) => unknown | Promise<unknown>;
};

const cloneJsonSafe = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
};

const getOptionsKeys = (options: object) => Object.keys(options).sort();

const combineAbortSignals = (
  hubSignal: AbortSignal,
  userSignal: AbortSignal | undefined,
) => {
  if (userSignal === undefined) {
    return hubSignal;
  }

  if (userSignal.aborted) {
    return userSignal;
  }

  const controller = new AbortController();
  const abortFromHub = () => controller.abort(hubSignal.reason);
  const abortFromUser = () => controller.abort(userSignal.reason);

  hubSignal.addEventListener("abort", abortFromHub, { once: true });
  userSignal.addEventListener("abort", abortFromUser, { once: true });

  return controller.signal;
};

const withEventForwarding = (
  options: SandcastleRunOptions,
  runId: string,
  hubClient: HubClient,
): SandcastleRunOptions => {
  if (options.logging?.type !== "file") {
    return options;
  }

  const originalOnAgentStreamEvent = options.logging.onAgentStreamEvent;

  return {
    ...options,
    logging: {
      ...options.logging,
      onAgentStreamEvent: (event: unknown) => {
        void hubClient.recordRunEvent(runId, event);
        originalOnAgentStreamEvent?.(event);
      },
    },
  };
};

const wrapRunFunction =
  (
    realRun: (options: SandcastleRunOptions) => Promise<SandcastleRunResult>,
    functionName: "run" | "sandbox.run",
    options: WrapSandcastleOptions,
    sandboxOptions?: object,
  ) =>
  async (runOptions: SandcastleRunOptions) => {
    const optionsKeys = getOptionsKeys(runOptions);
    options.logCall?.({
      functionName,
      name: runOptions.name,
      optionsKeys,
    });

    if (runOptions.signal?.aborted) {
      return realRun(runOptions);
    }

    const abortController = new AbortController();
    const runId = await options.hubClient.registerRunStart({
      name: runOptions.name,
      optionsKeys,
      configSnapshot:
        (await options.snapshotConfig?.(runOptions)) ??
        cloneJsonSafe(runOptions),
      abortController,
      originalOptions: runOptions,
      sandboxOptions,
    });

    const nextOptions = withEventForwarding(
      {
        ...runOptions,
        signal: combineAbortSignals(abortController.signal, runOptions.signal),
      },
      runId,
      options.hubClient,
    );

    let result: SandcastleRunResult;

    try {
      result = await realRun(nextOptions);
    } catch (error) {
      await options.hubClient.recordRunFailed?.({ runId, error });
      throw error;
    }

    await options.hubClient.recordRunComplete({ runId, result });

    if (runOptions.name === "planner" && typeof result.stdout === "string") {
      await options.hubClient.recordPlannerOutput(runId, result.stdout);
    }

    return result;
  };

const wrapSandbox = (
  sandbox: SandcastleSandbox,
  options: WrapSandcastleOptions,
  sandboxOptions: object,
): SandcastleSandbox => {
  if (typeof sandbox.run !== "function") {
    return sandbox;
  }

  return {
    ...sandbox,
    run: wrapRunFunction(
      sandbox.run.bind(sandbox),
      "sandbox.run",
      options,
      sandboxOptions,
    ),
  };
};

export const wrapSandcastleModule = <TModule extends SandcastleModule>(
  realModule: TModule,
  options: WrapSandcastleOptions,
): TModule => {
  const wrapped = { ...realModule } as SandcastleModule;

  if (typeof realModule.run === "function") {
    wrapped.run = wrapRunFunction(realModule.run, "run", options);
  }

  if (typeof realModule.createSandbox === "function") {
    wrapped.createSandbox = async (createOptions: object) => {
      options.logCall?.({
        functionName: "createSandbox",
        name: undefined,
        optionsKeys: getOptionsKeys(createOptions),
      });

      const sandbox = await realModule.createSandbox?.(createOptions);
      if (sandbox === undefined) {
        throw new Error("sandcastle.createSandbox returned undefined");
      }

      return wrapSandbox(sandbox, options, createOptions);
    };
  }

  return wrapped as TModule;
};
