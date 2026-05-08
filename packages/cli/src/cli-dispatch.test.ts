import { describe, expect, it } from "vitest";
import { type CliHandlers, dispatchCli } from "./cli-dispatch.ts";

const createRecorder = () => {
  const calls: unknown[] = [];
  const handlers: CliHandlers = {
    run: (command) => {
      calls.push(command);
      return 7;
    },
    hubStart: (command) => {
      calls.push(command);
      return 7;
    },
    hubStop: (command) => {
      calls.push(command);
      return 7;
    },
    hubStatus: (command) => {
      calls.push(command);
      return 7;
    },
    open: (command) => {
      calls.push(command);
      return 7;
    },
  };

  return { calls, handlers };
};

describe("cli-dispatch", () => {
  it("routes known subcommands to their handlers with parsed args", async () => {
    const { calls, handlers } = createRecorder();

    await expect(
      dispatchCli(["run", ".sandcastle/main.ts"], { handlers }),
    ).resolves.toBe(7);
    await expect(
      dispatchCli(["hub", "start", "--detach"], { handlers }),
    ).resolves.toBe(7);
    await expect(dispatchCli(["hub", "stop"], { handlers })).resolves.toBe(7);
    await expect(dispatchCli(["hub", "status"], { handlers })).resolves.toBe(7);
    await expect(dispatchCli(["open"], { handlers })).resolves.toBe(7);

    expect(calls).toEqual([
      {
        name: "run",
        mainPath: ".sandcastle/main.ts",
        hubUrl: undefined,
        title: undefined,
        open: true,
      },
      {
        name: "hub start",
        detach: true,
      },
      {
        name: "hub stop",
      },
      {
        name: "hub status",
      },
      {
        name: "open",
      },
    ]);
  });

  it("prints help and exits non-zero for unknown subcommands", async () => {
    const output: string[] = [];

    await expect(
      dispatchCli(["bogus"], {
        stdout: (message) => output.push(message),
      }),
    ).resolves.toBe(1);

    expect(output.join("\n")).toContain("Usage: watchtower <command>");
    expect(output.join("\n")).toContain("watchtower run");
  });

  it("recognizes hub start --detach as a flag", async () => {
    const { calls, handlers } = createRecorder();

    await dispatchCli(["hub", "start", "--detach"], { handlers });

    expect(calls).toEqual([
      {
        name: "hub start",
        detach: true,
      },
    ]);
  });

  it("prints help and exits non-zero when run is missing main.ts", async () => {
    const output: string[] = [];
    const { calls, handlers } = createRecorder();

    await expect(
      dispatchCli(["run"], {
        handlers,
        stderr: (message) => output.push(message),
      }),
    ).resolves.toBe(1);

    expect(calls).toEqual([]);
    expect(output.join("\n")).toContain("Missing required argument: <main.ts>");
    expect(output.join("\n")).toContain("watchtower run");
  });

  it("prints the V1 surface for --help", async () => {
    const output: string[] = [];

    await expect(
      dispatchCli(["--help"], {
        stdout: (message) => output.push(message),
      }),
    ).resolves.toBe(0);

    expect(output.join("\n")).toContain("watchtower run");
    expect(output.join("\n")).toContain("watchtower hub start [--detach]");
    expect(output.join("\n")).toContain("watchtower hub stop");
    expect(output.join("\n")).toContain("watchtower hub status");
    expect(output.join("\n")).toContain("watchtower open");
  });

  it("parses run --hub and --no-open flags", async () => {
    const { calls, handlers } = createRecorder();

    await expect(
      dispatchCli(
        [
          "run",
          "--hub",
          "http://127.0.0.1:7788",
          "--no-open",
          ".sandcastle/main.ts",
        ],
        { handlers },
      ),
    ).resolves.toBe(7);

    expect(calls).toEqual([
      {
        name: "run",
        mainPath: ".sandcastle/main.ts",
        hubUrl: "http://127.0.0.1:7788",
        title: undefined,
        open: false,
      },
    ]);
  });

  it("parses run -m as a Job title override", async () => {
    const { calls, handlers } = createRecorder();

    await expect(
      dispatchCli(
        ["run", ".sandcastle/main.ts", "-m", "fix: manual Job title"],
        {
          handlers,
        },
      ),
    ).resolves.toBe(7);

    expect(calls).toEqual([
      {
        name: "run",
        mainPath: ".sandcastle/main.ts",
        hubUrl: undefined,
        title: "fix: manual Job title",
        open: true,
      },
    ]);
  });

  it("prints an error when run --hub is missing its URL", async () => {
    const output: string[] = [];
    const { calls, handlers } = createRecorder();

    await expect(
      dispatchCli(["run", "--hub"], {
        handlers,
        stderr: (message) => output.push(message),
      }),
    ).resolves.toBe(1);

    expect(calls).toEqual([]);
    expect(output.join("\n")).toContain("Missing required value: --hub <url>");
  });
});
