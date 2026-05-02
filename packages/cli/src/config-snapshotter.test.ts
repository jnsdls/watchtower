import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createConfigSnapshot,
  sanitizeForConfigSnapshot,
} from "./config-snapshotter";

describe("config-snapshotter", () => {
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
});
