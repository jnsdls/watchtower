import { spawn } from "node:child_process";
import { existsSync, openSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type HubConfig = {
  url: string;
  port: number;
  home: string;
  pidPath: string;
  logPath: string;
};

export type HubPing =
  | {
      reachable: true;
      version: string;
    }
  | {
      reachable: false;
      error?: string;
    };

export type DetachedStartResult = {
  status: "already-running" | "started";
  pid: number;
  url: string;
  logPath: string;
};

export type StopHubResult =
  | { status: "not-running" }
  | { status: "stale"; pid: number }
  | { status: "stopped"; pid: number; signal: "SIGTERM" | "SIGKILL" };

export type HubStatus =
  | { reachable: true; url: string; version: string }
  | { reachable: false; url: string; error?: string };

export type EnsureHubResult = {
  status: "already-running" | "started";
  url: string;
  version: string;
};

type DetachedProcess = {
  pid?: number;
  unref?: () => void;
};

type HubBootstrapDependencies = {
  fetch?: typeof fetch;
  spawnDetached?: (config: HubConfig) => DetachedProcess;
  spawnForeground?: (config: HubConfig) => Promise<number>;
  isProcessRunning?: (pid: number) => boolean;
  killProcess?: (pid: number, signal: NodeJS.Signals) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  readinessTimeoutMs?: number;
  readinessIntervalMs?: number;
  pingHub?: (config: HubConfig) => Promise<HubPing>;
  openUrl?: (url: string) => Promise<void>;
  stopGracefulTimeoutMs?: number;
  stopForcefulTimeoutMs?: number;
};

const defaultPort = 7777;
const defaultBindAddress = "127.0.0.1";
const defaultReadinessTimeoutMs = 30_000;
const defaultReadinessIntervalMs = 250;
const stopPollIntervalMs = 100;
const defaultStopGracefulTimeoutMs = 10_000;
const defaultStopForcefulTimeoutMs = 2_000;

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const hubPackageRoot = resolve(packageRoot, "packages/hub");

export const resolveHubConfig = (
  overrides: Partial<Pick<HubConfig, "url" | "port" | "home">> = {},
  env: NodeJS.ProcessEnv = process.env,
): HubConfig => {
  const home =
    overrides.home ?? env.WATCHTOWER_HOME ?? join(homedir(), ".watchtower");
  const port = Number(overrides.port ?? env.WATCHTOWER_PORT ?? defaultPort);
  const url =
    overrides.url ??
    env.WATCHTOWER_URL ??
    `http://${defaultBindAddress}:${port}`;

  return {
    url,
    port,
    home,
    pidPath: join(home, "hub.pid"),
    logPath: join(home, "hub.log"),
  };
};

export const pingHub = async (
  config: HubConfig,
  dependencies: HubBootstrapDependencies = {},
): Promise<HubPing> => {
  const fetchImplementation = dependencies.fetch ?? fetch;

  try {
    const response = await fetchImplementation(
      new URL("/api/health", config.url),
    );

    if (!response.ok) {
      return {
        reachable: false,
        error: `HTTP ${response.status}`,
      };
    }

    const body = (await response.json()) as { version?: unknown };

    return {
      reachable: true,
      version: typeof body.version === "string" ? body.version : "unknown",
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const sleep = (ms: number) =>
  new Promise<void>((resolveSleep) => setTimeout(resolveSleep, ms));

const isProcessRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    const procStatPath = `/proc/${pid}/stat`;

    if (existsSync(procStatPath)) {
      const statContents = readFileSync(procStatPath, "utf8");
      const state = statContents.split(" ")[2];

      if (state === "Z") {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};

const killProcess = (pid: number, signal: NodeJS.Signals) => {
  process.kill(process.platform === "win32" ? pid : -pid, signal);
};

const readPid = async (pidPath: string) => {
  try {
    const rawPid = (await readFile(pidPath, "utf8")).trim();
    const pid = Number(rawPid);
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }

    throw error;
  }
};

const clearPid = async (pidPath: string) => {
  await rm(pidPath, { force: true });
};

const writePid = async (pidPath: string, pid: number) => {
  await mkdir(dirname(pidPath), { recursive: true });
  await writeFile(pidPath, `${pid}\n`, "utf8");
};

const createHubEnvironment = (config: HubConfig): NodeJS.ProcessEnv => ({
  ...process.env,
  HOSTNAME: defaultBindAddress,
  PORT: String(config.port),
  WATCHTOWER_HOME: config.home,
  WATCHTOWER_PORT: String(config.port),
  WATCHTOWER_URL: config.url,
});

const createHubCommand = (config: HubConfig) => {
  const standaloneServer = join(
    hubPackageRoot,
    ".next",
    "standalone",
    "packages",
    "hub",
    "server.js",
  );

  if (!existsSync(standaloneServer)) {
    return {
      command: "bun",
      args: [
        "x",
        "next",
        "dev",
        "-H",
        defaultBindAddress,
        "-p",
        String(config.port),
      ],
      cwd: hubPackageRoot,
      env: createHubEnvironment(config),
    };
  }

  return {
    command: "node",
    args: [standaloneServer],
    cwd: hubPackageRoot,
    env: createHubEnvironment(config),
  };
};

const spawnDetached = (config: HubConfig): DetachedProcess => {
  const command = createHubCommand(config);
  const log = openSync(config.logPath, "a");
  const child = spawn(command.command, command.args, {
    cwd: command.cwd,
    detached: true,
    env: command.env,
    stdio: ["ignore", log, log],
  });

  child.unref();
  return child;
};

const spawnForeground = (config: HubConfig): Promise<number> => {
  const command = createHubCommand(config);
  const child = spawn(command.command, command.args, {
    cwd: command.cwd,
    env: command.env,
    stdio: "inherit",
  });

  return new Promise((resolveExit) => {
    child.on("exit", (code, signal) => {
      if (typeof code === "number") {
        resolveExit(code);
        return;
      }

      resolveExit(signal === null ? 1 : 128);
    });
    child.on("error", () => resolveExit(1));
  });
};

export const startHubForeground = async (
  config = resolveHubConfig(),
  dependencies: HubBootstrapDependencies = {},
) => {
  await mkdir(config.home, { recursive: true });
  return (dependencies.spawnForeground ?? spawnForeground)(config);
};

export const startHubDetached = async (
  config = resolveHubConfig(),
  dependencies: HubBootstrapDependencies = {},
): Promise<DetachedStartResult> => {
  const processRunning = dependencies.isProcessRunning ?? isProcessRunning;
  const existingPid = await readPid(config.pidPath);

  if (existingPid !== undefined && processRunning(existingPid)) {
    return {
      status: "already-running",
      pid: existingPid,
      url: config.url,
      logPath: config.logPath,
    };
  }

  if (existingPid !== undefined) {
    await clearPid(config.pidPath);
  }

  await mkdir(config.home, { recursive: true });
  const child = (dependencies.spawnDetached ?? spawnDetached)(config);

  if (child.pid === undefined) {
    throw new Error(
      "Failed to start Hub: spawned process did not expose a PID.",
    );
  }

  await writePid(config.pidPath, child.pid);
  child.unref?.();

  return {
    status: "started",
    pid: child.pid,
    url: config.url,
    logPath: config.logPath,
  };
};

export const stopDetachedHub = async (
  config = resolveHubConfig(),
  dependencies: HubBootstrapDependencies = {},
): Promise<StopHubResult> => {
  const processRunning = dependencies.isProcessRunning ?? isProcessRunning;
  const signalProcess = dependencies.killProcess ?? killProcess;
  const wait = dependencies.sleep ?? sleep;
  const gracefulTimeoutMs =
    dependencies.stopGracefulTimeoutMs ?? defaultStopGracefulTimeoutMs;
  const forcefulTimeoutMs =
    dependencies.stopForcefulTimeoutMs ?? defaultStopForcefulTimeoutMs;
  const existingPid = await readPid(config.pidPath);

  if (existingPid === undefined) {
    return { status: "not-running" };
  }

  if (!processRunning(existingPid)) {
    await clearPid(config.pidPath);
    return { status: "stale", pid: existingPid };
  }

  const waitForExit = async (timeoutMs: number) => {
    const attempts = Math.max(1, Math.ceil(timeoutMs / stopPollIntervalMs));

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!processRunning(existingPid)) {
        return true;
      }

      await wait(stopPollIntervalMs);
    }

    return !processRunning(existingPid);
  };

  signalProcess(existingPid, "SIGTERM");

  if (await waitForExit(gracefulTimeoutMs)) {
    await clearPid(config.pidPath);
    return { status: "stopped", pid: existingPid, signal: "SIGTERM" };
  }

  signalProcess(existingPid, "SIGKILL");

  if (await waitForExit(forcefulTimeoutMs)) {
    await clearPid(config.pidPath);
    return { status: "stopped", pid: existingPid, signal: "SIGKILL" };
  }

  throw new Error(`Timed out waiting for Hub process ${existingPid} to stop.`);
};

export const getHubStatus = async (
  config = resolveHubConfig(),
  dependencies: HubBootstrapDependencies = {},
): Promise<HubStatus> => {
  const result = await (dependencies.pingHub ?? pingHub)(config, dependencies);

  if (!result.reachable) {
    return {
      reachable: false,
      url: config.url,
      error: result.error,
    };
  }

  return {
    reachable: true,
    url: config.url,
    version: result.version,
  };
};

export const ensureHubReachable = async (
  config = resolveHubConfig(),
  dependencies: HubBootstrapDependencies = {},
): Promise<EnsureHubResult> => {
  const probe = dependencies.pingHub ?? pingHub;
  const initial = await probe(config, dependencies);

  if (initial.reachable) {
    return {
      status: "already-running",
      url: config.url,
      version: initial.version,
    };
  }

  await startHubDetached(config, dependencies);

  const wait = dependencies.sleep ?? sleep;
  const now = dependencies.now ?? Date.now;
  const timeoutMs =
    dependencies.readinessTimeoutMs ?? defaultReadinessTimeoutMs;
  const intervalMs =
    dependencies.readinessIntervalMs ?? defaultReadinessIntervalMs;
  const deadline = now() + timeoutMs;

  while (now() <= deadline) {
    const result = await probe(config, dependencies);

    if (result.reachable) {
      return {
        status: "started",
        url: config.url,
        version: result.version,
      };
    }

    await wait(intervalMs);
  }

  throw new Error(
    `Timed out waiting for Hub at ${config.url} to become ready.`,
  );
};

export const openHub = async (
  config = resolveHubConfig(),
  dependencies: HubBootstrapDependencies = {},
) => {
  await (dependencies.openUrl ?? openUrl)(config.url);
};

const openUrl = async (url: string) => {
  const { command, args } = openUrlCommand(url);
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
};

const openUrlCommand = (url: string) => {
  switch (process.platform) {
    case "darwin":
      return { command: "open", args: [url] };
    case "win32":
      return { command: "cmd", args: ["/c", "start", "", url] };
    default:
      return { command: "xdg-open", args: [url] };
  }
};
