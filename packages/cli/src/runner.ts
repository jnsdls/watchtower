import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createWrappedSandcastleModuleSource } from "./loader-module-source.ts";

export type RuntimeName = "bun" | "node";

export type RunnerOptions = {
  readonly runtime?: RuntimeName;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly stdout?: NodeJS.WritableStream;
  readonly stderr?: NodeJS.WritableStream;
};

const isBunRuntime = () => typeof Bun !== "undefined";

export const detectRuntime = (): RuntimeName =>
  isBunRuntime() ? "bun" : "node";

const cliSourceDirUrl = new URL(".", import.meta.url);

const getRegisterPath = (runtime: RuntimeName) =>
  runtime === "bun"
    ? new URL("./bun-loader-register.ts", cliSourceDirUrl)
    : new URL("./node-loader-register.ts", cliSourceDirUrl);

const getRunnerEntryPath = () => new URL("./runner-entry.ts", cliSourceDirUrl);

const getRealSandcastleUrl = (env: NodeJS.ProcessEnv) =>
  env.WATCHTOWER_SANDCASTLE_URL ?? import.meta.resolve("@ai-hero/sandcastle");

const createBunTransformedEntry = async (
  mainPath: string,
  env: NodeJS.ProcessEnv,
) => {
  const source = await readFile(mainPath, "utf8");
  const tempId = randomUUID();
  const mainDir = dirname(mainPath);
  const wrapperPath = join(mainDir, `.watchtower-sandcastle-${tempId}.mjs`);
  const entryPath = join(mainDir, `.watchtower-main-${tempId}.mjs`);
  const wrapperUrl = pathToFileURL(wrapperPath).href;
  const transformedSource = source
    .replaceAll('"@ai-hero/sandcastle"', JSON.stringify(wrapperUrl))
    .replaceAll("'@ai-hero/sandcastle'", JSON.stringify(wrapperUrl));

  await writeFile(
    wrapperPath,
    createWrappedSandcastleModuleSource({
      realSandcastleUrl: getRealSandcastleUrl(env),
      wrapperRuntimeUrl: new URL("./loader-runtime.ts", cliSourceDirUrl).href,
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

export const runWithLoader = async (
  mainPath: string,
  options: RunnerOptions = {},
) => {
  const runtime = options.runtime ?? detectRuntime();
  const cwd = options.cwd ?? process.cwd();
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const absoluteMainPath = resolve(cwd, mainPath);
  const env = {
    ...(options.env ?? process.env),
    WATCHTOWER_MAIN_URL: pathToFileURL(absoluteMainPath).href,
  };

  if (runtime === "bun") {
    const bunEntry = await createBunTransformedEntry(absoluteMainPath, env);

    try {
      return await runChild(
        "bun",
        [
          "--preload",
          fileURLToPath(getRegisterPath("bun")),
          bunEntry.entryPath,
        ],
        { cwd, stderr, stdout },
        env,
      );
    } finally {
      await Promise.all([
        rm(bunEntry.entryPath, { force: true }),
        rm(bunEntry.wrapperPath, { force: true }),
      ]);
    }
  }

  return runChild(
    "node",
    [
      "--experimental-strip-types",
      "--import",
      pathToFileURL(fileURLToPath(getRegisterPath("node"))).href,
      fileURLToPath(getRunnerEntryPath()),
    ],
    { cwd, stderr, stdout },
    env,
  );
};
