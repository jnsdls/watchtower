import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ensureHubReachable,
  getHubStatus,
  resolveHubConfig,
  startHubDetached,
  stopDetachedHub,
} from "./hub-bootstrap.ts";

const createHome = async () => mkdtemp(join(tmpdir(), "watchtower-hub-"));

describe("hub-bootstrap", () => {
  it("resolves Hub URL, port, and home from environment overrides", () => {
    expect(
      resolveHubConfig(
        {},
        {
          NODE_ENV: "test",
          WATCHTOWER_HOME: "/tmp/watchtower-home",
          WATCHTOWER_PORT: "7788",
          WATCHTOWER_URL: "http://127.0.0.1:7788",
        },
      ),
    ).toEqual({
      url: "http://127.0.0.1:7788",
      port: 7788,
      home: "/tmp/watchtower-home",
      pidPath: "/tmp/watchtower-home/hub.pid",
      logPath: "/tmp/watchtower-home/hub.log",
    });
  });

  it("writes a PID file when spawning a detached Hub", async () => {
    const home = await createHome();

    try {
      const result = await startHubDetached(resolveHubConfig({ home }), {
        spawnDetached: () => ({ pid: 12345 }),
        isProcessRunning: () => false,
      });

      await expect(readFile(join(home, "hub.pid"), "utf8")).resolves.toBe(
        "12345\n",
      );
      expect(result).toEqual({
        status: "started",
        pid: 12345,
        url: "http://127.0.0.1:7777",
        logPath: join(home, "hub.log"),
      });
    } finally {
      await rm(home, { force: true, recursive: true });
    }
  });

  it("stops a detached Hub and clears the PID file", async () => {
    const home = await createHome();
    const killed: Array<{ pid: number; signal: NodeJS.Signals }> = [];
    let running = true;

    try {
      await startHubDetached(resolveHubConfig({ home }), {
        spawnDetached: () => ({ pid: 12345 }),
        isProcessRunning: () => false,
      });

      const result = await stopDetachedHub(resolveHubConfig({ home }), {
        isProcessRunning: () => running,
        killProcess: (pid, signal) => {
          killed.push({ pid, signal });
          running = false;
        },
        sleep: async () => {},
      });

      expect(result).toEqual({ status: "stopped", pid: 12345 });
      expect(killed).toEqual([{ pid: 12345, signal: "SIGTERM" }]);
      await expect(stat(join(home, "hub.pid"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(home, { force: true, recursive: true });
    }
  });

  it("clears stale PID files without signalling a process", async () => {
    const home = await createHome();

    try {
      await startHubDetached(resolveHubConfig({ home }), {
        spawnDetached: () => ({ pid: 12345 }),
        isProcessRunning: () => false,
      });

      const result = await stopDetachedHub(resolveHubConfig({ home }), {
        isProcessRunning: () => false,
        killProcess: () => {
          throw new Error("must not kill stale PIDs");
        },
      });

      expect(result).toEqual({ status: "stale", pid: 12345 });
      await expect(stat(join(home, "hub.pid"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(home, { force: true, recursive: true });
    }
  });

  it("times out while waiting for Hub readiness", async () => {
    const home = await createHome();

    try {
      await expect(
        ensureHubReachable(resolveHubConfig({ home }), {
          pingHub: async () => ({ reachable: false }),
          spawnDetached: () => ({ pid: 12345 }),
          isProcessRunning: () => false,
          readinessTimeoutMs: 1,
          readinessIntervalMs: 1,
          sleep: async () => {},
        }),
      ).rejects.toThrow("Timed out waiting for Hub");
    } finally {
      await rm(home, { force: true, recursive: true });
    }
  });

  it("does not spawn a second Hub when the first ensure made it reachable", async () => {
    const home = await createHome();
    let reachable = false;
    let spawnCount = 0;

    try {
      const dependencies = {
        pingHub: async () => ({ reachable, version: "0.0.0" }),
        spawnDetached: () => {
          spawnCount += 1;
          reachable = true;
          return { pid: 12345 };
        },
        isProcessRunning: () => false,
        sleep: async () => {},
      };

      await expect(
        ensureHubReachable(resolveHubConfig({ home }), dependencies),
      ).resolves.toEqual({
        status: "started",
        url: "http://127.0.0.1:7777",
        version: "0.0.0",
      });
      await expect(
        ensureHubReachable(resolveHubConfig({ home }), dependencies),
      ).resolves.toEqual({
        status: "already-running",
        url: "http://127.0.0.1:7777",
        version: "0.0.0",
      });
      expect(spawnCount).toBe(1);
    } finally {
      await rm(home, { force: true, recursive: true });
    }
  });

  it("reports reachability, version, and URL", async () => {
    await expect(
      getHubStatus(resolveHubConfig({ url: "http://127.0.0.1:7788" }), {
        pingHub: async () => ({ reachable: true, version: "1.2.3" }),
      }),
    ).resolves.toEqual({
      reachable: true,
      url: "http://127.0.0.1:7788",
      version: "1.2.3",
    });
  });
});
