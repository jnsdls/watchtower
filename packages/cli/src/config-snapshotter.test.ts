import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createConfigSnapshot,
  sanitizeForConfigSnapshot,
} from "./config-snapshotter";

describe("config-snapshotter", () => {
  const snapshotHash = async (root: string) =>
    (
      await createConfigSnapshot(
        { cwd: root },
        {
          getParentCommitSha: async () => null,
          now: () => new Date("2026-05-02T20:00:00.000Z"),
        },
      )
    ).sandcastleDirHash;

  it("replaces non-JSON-safe values with typed placeholders", () => {
    const controller = new AbortController();
    const circular: Record<string, unknown> = {
      abort: controller.signal,
      bigint: 1n,
      date: new Date("2026-05-02T20:00:00.000Z"),
      fn: () => undefined,
      nested: [{ stream: new ReadableStream() }],
    };
    circular.self = circular;

    expect(sanitizeForConfigSnapshot(circular)).toEqual({
      abort: "[AbortSignal]",
      bigint: "[BigInt:1]",
      date: "2026-05-02T20:00:00.000Z",
      fn: "[Function]",
      nested: [{ stream: "[ReadableStream]" }],
      self: "[Circular]",
    });
  });

  it("captures options, raw and resolved prompts, git state, and .sandcastle hash", async () => {
    const root = await mkdtemp(join(tmpdir(), "watchtower-snapshot-"));
    await mkdir(join(root, ".sandcastle"), { recursive: true });
    await writeFile(join(root, ".sandcastle", "prompt.md"), "Hello {{NAME}}");

    const snapshot = await createConfigSnapshot(
      {
        cwd: root,
        promptFile: join(root, ".sandcastle", "prompt.md"),
        promptArgs: { NAME: "Watchtower" },
        signal: new AbortController().signal,
      },
      {
        getParentCommitSha: async () => "abc123",
        now: () => new Date("2026-05-02T20:00:00.000Z"),
      },
    );

    expect(snapshot).toMatchObject({
      options: {
        cwd: root,
        promptArgs: { NAME: "Watchtower" },
        signal: "[AbortSignal]",
      },
      prompts: {
        raw: { [join(root, ".sandcastle", "prompt.md")]: "Hello {{NAME}}" },
        resolved: {
          [join(root, ".sandcastle", "prompt.md")]: "Hello Watchtower",
        },
      },
      parentCommitSha: "abc123",
      capturedAt: "2026-05-02T20:00:00.000Z",
    });
    expect(snapshot.sandcastleDirHash).toMatch(/^sha256:/);
  });

  it("returns null when .sandcastle is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "watchtower-snapshot-"));

    await expect(snapshotHash(root)).resolves.toBeNull();
  });

  it("hashes only allowlisted config files and skips scratch or hidden paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "watchtower-snapshot-"));
    const sandcastle = join(root, ".sandcastle");
    await mkdir(join(sandcastle, "prompts"), { recursive: true });
    await writeFile(join(sandcastle, "main.ts"), "main v1");
    await writeFile(join(sandcastle, "helper.js"), "helper v1");
    await writeFile(join(sandcastle, "module.mjs"), "module v1");
    await writeFile(join(sandcastle, "common.cjs"), "common v1");
    await writeFile(join(sandcastle, "prompt.md"), "prompt v1");
    await writeFile(join(sandcastle, "Dockerfile"), "FROM node:22");
    await writeFile(join(sandcastle, "prompts", "sub.md"), "nested v1");

    const baseline = await snapshotHash(root);

    await writeFile(join(sandcastle, "foo.log"), "excluded log");
    await writeFile(join(sandcastle, "foo.txt"), "excluded text");
    await writeFile(join(sandcastle, ".DS_Store"), "hidden top-level file");
    await mkdir(join(sandcastle, ".hidden"), { recursive: true });
    await writeFile(join(sandcastle, ".hidden", "prompt.md"), "hidden config");
    await mkdir(join(sandcastle, "prompts", ".cache"), { recursive: true });
    await writeFile(
      join(sandcastle, "prompts", ".cache", "sub.md"),
      "hidden nested config",
    );
    await mkdir(join(sandcastle, "worktrees", "one"), { recursive: true });
    await writeFile(join(sandcastle, "worktrees", "one", "main.ts"), "scratch");
    await mkdir(join(sandcastle, "logs"), { recursive: true });
    await writeFile(join(sandcastle, "logs", "run.md"), "scratch");
    await mkdir(join(sandcastle, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(sandcastle, "node_modules", "pkg", "index.ts"), "pkg");

    expect(await snapshotHash(root)).toBe(baseline);

    await writeFile(join(sandcastle, "prompts", "sub.md"), "nested v2");
    expect(await snapshotHash(root)).not.toBe(baseline);
  });

  it("changes the hash when allowlisted top-level config files change", async () => {
    const root = await mkdtemp(join(tmpdir(), "watchtower-snapshot-"));
    const sandcastle = join(root, ".sandcastle");
    await mkdir(sandcastle, { recursive: true });
    await writeFile(join(sandcastle, "main.ts"), "main v1");
    const baseline = await snapshotHash(root);

    for (const fileName of [
      "main.ts",
      "helper.js",
      "module.mjs",
      "common.cjs",
      "prompt.md",
      "Dockerfile",
    ]) {
      await writeFile(join(sandcastle, fileName), `${fileName} v2`);
      expect(await snapshotHash(root)).not.toBe(baseline);
      await writeFile(join(sandcastle, fileName), `${fileName} v3`);
      expect(await snapshotHash(root)).not.toBe(baseline);
    }
  });
});
