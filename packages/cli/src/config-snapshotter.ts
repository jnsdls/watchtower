import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

export type ConfigSnapshot = {
  readonly options: unknown;
  readonly prompts: {
    readonly raw: Record<string, string>;
    readonly resolved: Record<string, string>;
  };
  readonly promptArgs: unknown;
  readonly sandcastleDirHash: string | null;
  readonly parentCommitSha: string | null;
  readonly capturedAt: string;
};

type ConfigSnapshotDependencies = {
  readonly getParentCommitSha?: (cwd: string) => Promise<string | null>;
  readonly now?: () => Date;
};

const execFileAsync = promisify(execFile);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const placeholderFor = (value: unknown) => {
  if (typeof value === "function") {
    return "[Function]";
  }

  if (typeof value === "bigint") {
    return `[BigInt:${value.toString()}]`;
  }

  if (typeof AbortSignal !== "undefined" && value instanceof AbortSignal) {
    return "[AbortSignal]";
  }

  if (
    typeof ReadableStream !== "undefined" &&
    value instanceof ReadableStream
  ) {
    return "[ReadableStream]";
  }

  return undefined;
};

export const sanitizeForConfigSnapshot = (
  value: unknown,
  seen = new WeakSet<object>(),
): unknown => {
  const placeholder = placeholderFor(value);

  if (placeholder !== undefined) {
    return placeholder;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForConfigSnapshot(item, seen));
  }

  return Object.fromEntries(
    Object.keys(value).map((key) => [
      key,
      sanitizeForConfigSnapshot(value[key], seen),
    ]),
  );
};

const substitutePromptArgs = (content: string, promptArgs: unknown) => {
  if (!isRecord(promptArgs)) {
    return content;
  }

  return content.replaceAll(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const value = promptArgs[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
};

const readPromptFiles = async (options: Record<string, unknown>) => {
  const raw: Record<string, string> = {};
  const resolved: Record<string, string> = {};

  if (typeof options.prompt === "string") {
    raw.inline = options.prompt;
    resolved.inline = substitutePromptArgs(options.prompt, options.promptArgs);
  }

  if (typeof options.promptFile === "string") {
    const promptPath = resolve(String(options.promptFile));
    const content = await readFile(promptPath, "utf8");
    raw[promptPath] = content;
    resolved[promptPath] = substitutePromptArgs(content, options.promptArgs);
  }

  return { raw, resolved };
};

const hashDirectory = async (directory: string): Promise<string | null> => {
  const hash = createHash("sha256");

  const walk = async (current: string) => {
    let entries: Dirent[];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }

      if (entry.isFile()) {
        hash.update(path);
        hash.update(await readFile(path));
      }
    }

    return true;
  };

  return (await walk(directory)) ? `sha256:${hash.digest("hex")}` : null;
};

const getParentCommitSha = async (cwd: string) => {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
};

export const createConfigSnapshot = async (
  options: Record<string, unknown>,
  dependencies: ConfigSnapshotDependencies = {},
): Promise<ConfigSnapshot> => {
  const cwd =
    typeof options.cwd === "string" ? resolve(options.cwd) : process.cwd();
  const prompts = await readPromptFiles(options);

  return {
    options: sanitizeForConfigSnapshot(options),
    prompts,
    promptArgs: sanitizeForConfigSnapshot(options.promptArgs),
    sandcastleDirHash: await hashDirectory(join(cwd, ".sandcastle")),
    parentCommitSha: await (
      dependencies.getParentCommitSha ?? getParentCommitSha
    )(cwd),
    capturedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
  };
};
