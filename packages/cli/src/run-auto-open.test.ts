import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { autoOpenDashboardForRun } from "./run-auto-open";

describe("run auto-open", () => {
  let home: string;
  let openedUrls: string[];

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "watchtower-auto-open-"));
    openedUrls = [];
  });

  afterEach(async () => {
    await rm(home, { force: true, recursive: true });
  });

  it("opens the Dashboard only on the first run for a Watchtower home", async () => {
    const env: NodeJS.ProcessEnv = { ...process.env, WATCHTOWER_HOME: home };
    const opener = (url: string) => {
      openedUrls.push(url);
    };

    await expect(
      autoOpenDashboardForRun({ env, open: true, opener }),
    ).resolves.toBe(true);
    await expect(
      autoOpenDashboardForRun({ env, open: true, opener }),
    ).resolves.toBe(false);

    expect(openedUrls).toEqual(["http://127.0.0.1:7777"]);
  });

  it("honors --no-open even before the first run opens the Dashboard", async () => {
    const env: NodeJS.ProcessEnv = { ...process.env, WATCHTOWER_HOME: home };
    const opener = (url: string) => {
      openedUrls.push(url);
    };

    await expect(
      autoOpenDashboardForRun({ env, open: false, opener }),
    ).resolves.toBe(false);
    await expect(
      autoOpenDashboardForRun({
        env,
        hubUrl: "http://127.0.0.1:7788",
        open: true,
        opener,
      }),
    ).resolves.toBe(true);

    expect(openedUrls).toEqual(["http://127.0.0.1:7788"]);
  });
});
