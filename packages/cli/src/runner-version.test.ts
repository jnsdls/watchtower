import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { assertSupportedSandcastleVersion } from "./runner.ts";

const writeSandcastlePackage = async (version: string) => {
  const root = await mkdtemp(join(tmpdir(), "watchtower-sandcastle-version-"));
  const packageRoot = join(root, "node_modules", "@ai-hero", "sandcastle");
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, "index.mjs"),
    "export const run = () => {};",
  );
  await writeFile(
    join(packageRoot, "package.json"),
    JSON.stringify({ name: "@ai-hero/sandcastle", version }),
  );
  return pathToFileURL(resolve(packageRoot, "index.mjs")).href;
};

describe("sandcastle version floor", () => {
  it("rejects versions before the IterationUsage floor", async () => {
    await expect(
      assertSupportedSandcastleVersion({
        ...process.env,
        WATCHTOWER_SANDCASTLE_URL: await writeSandcastlePackage("0.5.6"),
      }),
    ).rejects.toThrow(/Install @ai-hero\/sandcastle >=0\.5\.7.*148905b/);
  });
});
