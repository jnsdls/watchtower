import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url).pathname;

const readJson = (path: string) =>
  JSON.parse(readFileSync(join(root, path), "utf8")) as Record<string, unknown>;

describe("workspace scaffold", () => {
  it("declares the package layout and toolchain gates", () => {
    const rootPackage = readJson("package.json");

    expect(rootPackage).toMatchObject({
      private: true,
      license: "MIT",
      engines: {
        node: ">=22",
        bun: ">=1.2",
      },
      workspaces: ["packages/*"],
    });

    expect(rootPackage.scripts).toMatchObject({
      check: "bun run typecheck && bun run lint && bun test",
      lint: "biome check .",
      typecheck: "tsc --noEmit",
    });

    for (const packageName of ["cli", "hub", "protocol"]) {
      const packageJson = readJson(`packages/${packageName}/package.json`);

      expect(packageJson).toMatchObject({
        name: `@watchtower/${packageName}`,
        private: true,
        type: "module",
      });

      expect(
        existsSync(join(root, `packages/${packageName}/src/index.ts`)),
      ).toBe(true);
    }
  });
});
