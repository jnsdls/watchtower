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
    expect(output.join("\n")).toContain("watchtower run <main.ts>");
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
    expect(output.join("\n")).toContain("watchtower run <main.ts>");
  });

  it("prints the V1 surface for --help", async () => {
    const output: string[] = [];

    await expect(
      dispatchCli(["--help"], {
        stdout: (message) => output.push(message),
      }),
    ).resolves.toBe(0);

    expect(output.join("\n")).toContain("watchtower run <main.ts>");
    expect(output.join("\n")).toContain("watchtower hub start [--detach]");
    expect(output.join("\n")).toContain("watchtower hub stop");
    expect(output.join("\n")).toContain("watchtower hub status");
    expect(output.join("\n")).toContain("watchtower open");
  });

  it.each([
    [["hub", "start"], "watchtower hub start is not implemented yet."],
    [
      ["hub", "start", "--detach"],
      "watchtower hub start is not implemented yet.",
    ],
    [["hub", "stop"], "watchtower hub stop is not implemented yet."],
    [["hub", "status"], "watchtower hub status is not implemented yet."],
    [["open"], "watchtower open is not implemented yet."],
  ])("uses a non-zero not implemented stub for %s", async (argv, expectedMessage) => {
    const output: string[] = [];

    await expect(
      dispatchCli(argv, {
        stderr: (message) => output.push(message),
      }),
    ).resolves.toBe(1);

    expect(output).toEqual([expectedMessage]);
  });
});
