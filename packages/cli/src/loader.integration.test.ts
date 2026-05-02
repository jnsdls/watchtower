import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { type RuntimeName, runWithLoader } from "./runner.ts";

const createStringSink = () => {
  let value = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      value += chunk.toString();
      callback();
    },
  });

  return {
    stream,
    value: () => value,
  };
};

const writeFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), "watchtower-loader-"));
  const fakePackageDir = join(root, "node_modules", "@ai-hero", "sandcastle");
  await mkdir(join(fakePackageDir, "sandboxes"), { recursive: true });

  await writeFile(
    join(fakePackageDir, "package.json"),
    JSON.stringify({
      name: "@ai-hero/sandcastle",
      type: "module",
      version: "0.5.7",
      exports: {
        ".": "./index.mjs",
        "./sandboxes/docker": "./sandboxes/docker.mjs",
      },
    }),
  );
  await writeFile(
    join(fakePackageDir, "index.mjs"),
    `
export const claudeCode = (model) => ({ provider: "claudeCode", model });

export const run = async (options) => {
  options.logging?.onAgentStreamEvent?.({ text: "event:" + options.name });
  return {
    stdout: "stdout:" + options.name,
    signalIsAbortSignal: options.signal instanceof AbortSignal
  };
};

export const createSandbox = async (options) => ({
  branch: options.branch,
  run: async (runOptions) => ({
    stdout: "sandbox:" + runOptions.name,
    signalIsAbortSignal: runOptions.signal instanceof AbortSignal
  })
});
`,
  );
  await writeFile(
    join(fakePackageDir, "sandboxes", "docker.mjs"),
    `
export const docker = () => ({ provider: "docker" });
`,
  );

  const mainPath = join(root, "main.mjs");
  await writeFile(
    mainPath,
    `
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const direct = await sandcastle.run({
  agent: sandcastle.claudeCode("fake"),
  logging: {
    type: "file",
    onAgentStreamEvent: (event) => console.log("user-event:" + event.text)
  },
  name: "planner",
  sandbox: docker()
});
const sandbox = await sandcastle.createSandbox({
  branch: "feature",
  sandbox: docker()
});
const nested = await sandbox.run({
  agent: sandcastle.claudeCode("fake"),
  name: "reviewer"
});

console.log(JSON.stringify({
  direct,
  nested,
  provider: docker().provider
}));
`,
  );

  return {
    mainPath,
    realSandcastleUrl: pathToFileURL(join(fakePackageDir, "index.mjs")).href,
    root,
  };
};

const parseCallLogs = (stderr: string) =>
  stderr
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.source === "watchtower");

describe("loader", () => {
  it.each<RuntimeName>([
    "bun",
    "node",
  ])("wraps sandcastle imports under %s and preserves behavior", async (runtime) => {
    const fixture = await writeFixture();
    const stdout = createStringSink();
    const stderr = createStringSink();

    const exitCode = await runWithLoader(fixture.mainPath, {
      cwd: fixture.root,
      env: {
        ...process.env,
        WATCHTOWER_SANDCASTLE_URL: fixture.realSandcastleUrl,
        WATCHTOWER_TELEMETRY_DISABLED: "1",
      },
      runtime,
      stderr: stderr.stream,
      stdout: stdout.stream,
    });

    if (exitCode !== 0) {
      console.error(stderr.value());
    }
    expect(exitCode).toBe(0);

    expect(stdout.value()).toContain("user-event:event:planner");
    expect(stdout.value()).toContain('"stdout":"stdout:planner"');
    expect(stdout.value()).toContain('"stdout":"sandbox:reviewer"');
    expect(stdout.value()).toContain('"provider":"docker"');

    expect(parseCallLogs(stderr.value())).toEqual([
      {
        source: "watchtower",
        event: "sandcastle-call",
        functionName: "run",
        name: "planner",
        optionsKeys: ["agent", "logging", "name", "sandbox"],
      },
      {
        source: "watchtower",
        event: "sandcastle-call",
        functionName: "createSandbox",
        optionsKeys: ["branch", "sandbox"],
      },
      {
        source: "watchtower",
        event: "sandcastle-call",
        functionName: "sandbox.run",
        name: "reviewer",
        optionsKeys: ["agent", "name"],
      },
    ]);
  });
});
