import { execFile } from "node:child_process";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";

export type ProjectIdentity = {
  readonly gitRemoteUrl: string | null;
  readonly localPath: string | null;
  readonly displayName: string;
};

type ProjectIdDependencies = {
  readonly execGit?: (args: readonly string[], cwd: string) => Promise<string>;
};

const execFileAsync = promisify(execFile);

const execGit = async (args: readonly string[], cwd: string) => {
  const { stdout } = await execFileAsync("git", [...args], { cwd });
  return stdout;
};

const displayNameFromRemote = (remoteUrl: string) =>
  basename(remoteUrl.replace(/\.git$/, ""));

export const identifyProject = async (
  cwd = process.cwd(),
  dependencies: ProjectIdDependencies = {},
): Promise<ProjectIdentity> => {
  const absoluteCwd = resolve(cwd);

  try {
    const remoteUrl = (
      await (dependencies.execGit ?? execGit)(
        ["remote", "get-url", "origin"],
        absoluteCwd,
      )
    ).trim();

    if (remoteUrl !== "") {
      return {
        gitRemoteUrl: remoteUrl,
        localPath: null,
        displayName: displayNameFromRemote(remoteUrl),
      };
    }
  } catch {
    // Fall through to local path identity.
  }

  return {
    gitRemoteUrl: null,
    localPath: absoluteCwd,
    displayName: basename(absoluteCwd),
  };
};
