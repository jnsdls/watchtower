import { execFile } from "node:child_process";
import { promisify } from "node:util";

type JobTitleDependencies = {
  readonly execGit?: (args: readonly string[], cwd: string) => Promise<string>;
};

const execFileAsync = promisify(execFile);

const execGit = async (args: readonly string[], cwd: string) => {
  const { stdout } = await execFileAsync("git", [...args], { cwd });
  return stdout;
};

export const resolveJobTitle = async (
  cwd: string,
  override: string | undefined,
  dependencies: JobTitleDependencies = {},
) => {
  if (override !== undefined) {
    return override;
  }

  const runGit = dependencies.execGit ?? execGit;

  try {
    await runGit(["symbolic-ref", "--quiet", "HEAD"], cwd);
    const subject = (await runGit(["log", "-1", "--format=%s"], cwd)).trim();
    return subject === "" ? null : subject;
  } catch {
    return null;
  }
};
