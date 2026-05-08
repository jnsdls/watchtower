import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sweepOrphanLoaderArtifacts } from "./runner.ts";

describe("sweepOrphanLoaderArtifacts", () => {
  it("removes stale .watchtower-main-* and .watchtower-sandcastle-* siblings, leaves others", async () => {
    const dir = await mkdtemp(join(tmpdir(), "watchtower-sweep-"));
    await writeFile(join(dir, ".watchtower-main-abc.ts"), "// stale");
    await writeFile(join(dir, ".watchtower-sandcastle-abc.mjs"), "// stale");
    await writeFile(join(dir, "main.ts"), "// keep");
    await writeFile(join(dir, ".env"), "KEEP=1");

    await sweepOrphanLoaderArtifacts(dir);

    expect((await readdir(dir)).sort()).toEqual([".env", "main.ts"]);
  });

  it("is a no-op when the directory does not exist", async () => {
    await expect(
      sweepOrphanLoaderArtifacts(join(tmpdir(), "watchtower-missing-xyz")),
    ).resolves.toBeUndefined();
  });
});
