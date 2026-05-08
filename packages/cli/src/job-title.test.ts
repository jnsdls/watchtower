import { describe, expect, it } from "vitest";
import { resolveJobTitle } from "./job-title";

describe("job-title", () => {
  it("uses the manual Job title override instead of git", async () => {
    let calledGit = false;

    await expect(
      resolveJobTitle("/work/watchtower", "fix: manual title", {
        execGit: async () => {
          calledGit = true;
          throw new Error("git should not be called");
        },
      }),
    ).resolves.toBe("fix: manual title");

    expect(calledGit).toBe(false);
  });

  it("captures the current git commit subject for the Job title", async () => {
    await expect(
      resolveJobTitle("/work/watchtower", undefined, {
        execGit: async (args) => {
          if (args.join(" ") === "symbolic-ref --quiet HEAD") {
            return "refs/heads/main\n";
          }

          if (args.join(" ") === "log -1 --format=%s") {
            return "feat: capture Job title\n";
          }

          throw new Error(`unexpected git command: ${args.join(" ")}`);
        },
      }),
    ).resolves.toBe("feat: capture Job title");
  });

  it("returns null when git title capture fails", async () => {
    await expect(
      resolveJobTitle("/work/no-git", undefined, {
        execGit: async () => {
          throw new Error("not a git Project");
        },
      }),
    ).resolves.toBeNull();
  });
});
