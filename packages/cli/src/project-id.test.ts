import { describe, expect, it } from "vitest";
import { identifyProject } from "./project-id";

describe("project-id", () => {
  it("identifies a Project by origin remote when available", async () => {
    await expect(
      identifyProject("/work/watchtower", {
        execGit: async (args) => {
          if (args.join(" ") === "remote get-url origin") {
            return "git@github.com:jnsdls/watchtower.git\n";
          }
          throw new Error("unexpected git command");
        },
      }),
    ).resolves.toEqual({
      gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
      localPath: null,
      displayName: "watchtower",
    });
  });

  it("falls back to local path when no origin remote exists", async () => {
    await expect(
      identifyProject("/work/no-remote", {
        execGit: async () => {
          throw new Error("no remote");
        },
      }),
    ).resolves.toEqual({
      gitRemoteUrl: null,
      localPath: "/work/no-remote",
      displayName: "no-remote",
    });
  });
});
