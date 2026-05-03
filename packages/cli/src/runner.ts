import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ensureHubReachable,
  type HubConfig,
  pingHub,
  resolveHubConfig,
} from "./hub-bootstrap.ts";
import { completeWatchtowerJob, startWatchtowerJob } from "./hub-client.ts";
import { createWrappedSandcastleModuleSource } from "./loader-module-source.ts";
import { identifyProject } from "./project-id.ts";
import { installSigintHandler } from "./signals.ts";

export type RuntimeName = "bun" | "node";

export type RunnerOptions = {
  readonly runtime?: RuntimeName;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly hubUrl?: string;
  readonly stdin?: NodeJS.ReadableStream;
  readonly stdout?: NodeJS.WritableStream;
  readonly stderr?: NodeJS.WritableStream;
};

export const detectRuntime = (): RuntimeName =>
  typeof Bun === "undefined" ? "node" : "bun";

const bunRegisterUrl = new URL("./bun-loader-register.ts", import.meta.url);
const nodeRegisterUrl = new URL("./node-loader-register.ts", import.meta.url);
const runnerEntryUrl = new URL("./runner-entry.ts", import.meta.url);
const wrapperRuntimeUrl = new URL("./loader-runtime.ts", import.meta.url).href;
const minimumSandcastleVersion = "0.5.7";

const parseVersion = (version: string) =>
  version
    .replace(/^[^\d]*/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10));

const isVersionAtLeast = (version: string, minimum: string) => {
  const actual = parseVersion(version);
  const floor = parseVersion(minimum);

  for (let index = 0; index < floor.length; index += 1) {
    const actualPart = actual[index] ?? 0;
    const floorPart = floor[index] ?? 0;

    if (actualPart > floorPart) {
      return true;
    }

    if (actualPart < floorPart) {
      return false;
    }
  }

  return true;
};

const findPackageJson = async (moduleUrl: string) => {
  let current = dirname(fileURLToPath(moduleUrl));

  for (;;) {
    const packageJsonPath = join(current, "package.json");

    try {
      return JSON.parse(await readFile(packageJsonPath, "utf8")) as {
        version?: unknown;
      };
    } catch {
      const next = dirname(current);

      if (next === current) {
        throw new Error("Could not find @ai-hero/sandcastle package.json.");
      }

      current = next;
    }
  }
};

export const assertSupportedSandcastleVersion = async (
  env: NodeJS.ProcessEnv = process.env,
) => {
  const sandcastleUrl =
    env.WATCHTOWER_SANDCASTLE_URL ?? import.meta.resolve("@ai-hero/sandcastle");
  const packageJson = await findPackageJson(sandcastleUrl);
  const version = packageJson.version;

  if (typeof version !== "string") {
    throw new Error("Could not determine @ai-hero/sandcastle version.");
  }

  if (!isVersionAtLeast(version, minimumSandcastleVersion)) {
    throw new Error(
      `@ai-hero/sandcastle ${version} is too old for Watchtower telemetry. ` +
        `Install @ai-hero/sandcastle >=${minimumSandcastleVersion} (the IterationUsage floor from sandcastle commit 148905b).`,
    );
  }
};

const promptToStartHub = async (
  config: HubConfig,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
) => {
  const prompt = createInterface({ input, output });

  try {
    const answer = await prompt.question(
      `Hub unreachable at ${config.url}. Start a detached Hub? [Y/n] `,
    );
    return !answer.trim().toLowerCase().startsWith("n");
  } finally {
    prompt.close();
  }
};

const ensureHubReachableForRun = async (
  config: HubConfig,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
) => {
  const initial = await pingHub(config);

  if (initial.reachable) {
    return initial;
  }

  if (!(await promptToStartHub(config, input, output))) {
    throw new Error(`Hub unreachable at ${config.url}.`);
  }

  return ensureHubReachable(config);
};

const createBunTransformedEntry = async (
  mainPath: string,
  env: NodeJS.ProcessEnv,
) => {
  const source = await readFile(mainPath, "utf8");
  const tempId = randomUUID();
  const mainDir = dirname(mainPath);
  const mainExt = extname(mainPath) || ".mjs";
  const wrapperPath = join(mainDir, `.watchtower-sandcastle-${tempId}.mjs`);
  const entryPath = join(mainDir, `.watchtower-main-${tempId}${mainExt}`);
  const wrapperUrl = pathToFileURL(wrapperPath).href;
  const transformedSource = source
    .replaceAll('"@ai-hero/sandcastle"', JSON.stringify(wrapperUrl))
    .replaceAll("'@ai-hero/sandcastle'", JSON.stringify(wrapperUrl));

  await writeFile(
    wrapperPath,
    createWrappedSandcastleModuleSource({
      realSandcastleUrl:
        env.WATCHTOWER_SANDCASTLE_URL ??
        import.meta.resolve("@ai-hero/sandcastle"),
      wrapperRuntimeUrl,
    }),
  );
  await writeFile(entryPath, transformedSource);

  return { entryPath, wrapperPath };
};

const runChild = (
  command: string,
  args: readonly string[],
  options: Required<Pick<RunnerOptions, "cwd" | "stdout" | "stderr">>,
  env: NodeJS.ProcessEnv,
) =>
  new Promise<number>((resolveExitCode) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    child.stdout.pipe(options.stdout);
    child.stderr.pipe(options.stderr);
    child.on("close", (code, signal) => {
      if (signal !== null) {
        resolveExitCode(1);
        return;
      }

      resolveExitCode(code ?? 1);
    });
    child.on("error", (error) => {
      options.stderr.write(`${error.message}\n`);
      resolveExitCode(1);
    });
  });

const formatErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const startTelemetryJobOrLog = async (
  hubConfig: HubConfig,
  cwd: string,
  stdin: NodeJS.ReadableStream,
  stderr: NodeJS.WritableStream,
) => {
  try {
    await ensureHubReachableForRun(hubConfig, stdin, stderr);
    return await startWatchtowerJob({
      hubUrl: hubConfig.url,
      project: await identifyProject(cwd),
    });
  } catch (error) {
    stderr.write(
      `Watchtower telemetry disabled: ${formatErrorMessage(error)}\n`,
    );
    return "";
  }
};

export const runWithLoader = async (
  mainPath: string,
  options: RunnerOptions = {},
) => {
  const runtime = options.runtime ?? detectRuntime();
  const cwd = options.cwd ?? process.cwd();
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const stdin = options.stdin ?? process.stdin;
  const absoluteMainPath = resolve(cwd, mainPath);
  const baseEnv = options.env ?? process.env;

  if (baseEnv.WATCHTOWER_SKIP_SANDCASTLE_VERSION_CHECK !== "1") {
    try {
      await assertSupportedSandcastleVersion(baseEnv);
    } catch (error) {
      stderr.write(`${formatErrorMessage(error)}\n`);
      return 1;
    }
  }

  const hubConfig = resolveHubConfig({ url: options.hubUrl }, baseEnv);
  const telemetryJobId =
    baseEnv.WATCHTOWER_TELEMETRY_DISABLED === "1"
      ? ""
      : await startTelemetryJobOrLog(hubConfig, cwd, stdin, stderr);

  const env = {
    ...baseEnv,
    WATCHTOWER_HUB_URL: hubConfig.url,
    WATCHTOWER_JOB_ID: telemetryJobId,
    WATCHTOWER_MAIN_URL: pathToFileURL(absoluteMainPath).href,
  };

  let wasCanceledBySignal = false;
  const completeJob = async (exitCode: number) => {
    const status = wasCanceledBySignal ? "canceled" : undefined;

    if (telemetryJobId !== "") {
      try {
        await completeWatchtowerJob(
          hubConfig.url,
          telemetryJobId,
          exitCode,
          status,
        );
      } catch {
        // Telemetry failures must not change the user's Runner exit code.
      }
    }

    return exitCode;
  };
  const uninstallSigintHandler = installSigintHandler({
    onFirstSignal: () => {
      wasCanceledBySignal = true;
    },
  });

  try {
    if (runtime === "bun") {
      const bunEntry = await createBunTransformedEntry(absoluteMainPath, env);

      try {
        return await completeJob(
          await runChild(
            "bun",
            ["--preload", fileURLToPath(bunRegisterUrl), bunEntry.entryPath],
            { cwd, stderr, stdout },
            env,
          ),
        );
      } finally {
        await Promise.all([
          rm(bunEntry.entryPath, { force: true }),
          rm(bunEntry.wrapperPath, { force: true }),
        ]);
      }
    }

    return completeJob(
      await runChild(
        "node",
        [
          "--experimental-strip-types",
          "--import",
          nodeRegisterUrl.href,
          fileURLToPath(runnerEntryUrl),
        ],
        { cwd, stderr, stdout },
        env,
      ),
    );
  } finally {
    uninstallSigintHandler();
  }
};
