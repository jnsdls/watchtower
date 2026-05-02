import { autoOpenDashboardForRun } from "./run-auto-open";

export type RunCommand = {
  name: "run";
  mainPath: string;
  hubUrl?: string;
  open: boolean;
};

export type HubStartCommand = {
  name: "hub start";
  detach: boolean;
};

export type HubStopCommand = {
  name: "hub stop";
};

export type HubStatusCommand = {
  name: "hub status";
};

export type OpenCommand = {
  name: "open";
};

export type CliCommand =
  | RunCommand
  | HubStartCommand
  | HubStopCommand
  | HubStatusCommand
  | OpenCommand;

export type CliHandlerResult = number | Promise<number>;

export type CliHandlers = {
  run: (command: RunCommand) => CliHandlerResult;
  hubStart: (command: HubStartCommand) => CliHandlerResult;
  hubStop: (command: HubStopCommand) => CliHandlerResult;
  hubStatus: (command: HubStatusCommand) => CliHandlerResult;
  open: (command: OpenCommand) => CliHandlerResult;
};

export type DispatchOptions = {
  handlers?: CliHandlers;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
};

const helpText = `Usage: watchtower <command>

Commands:
  watchtower run [--hub <url>] [--no-open] <main.ts>
  watchtower hub start [--detach]
  watchtower hub stop
  watchtower hub status
  watchtower open`;

const notImplemented =
  (message: string, stderr: (message: string) => void) => () => {
    stderr(`${message} is not implemented yet.`);
    return 1;
  };

const createDefaultHandlers = (
  stderr: (message: string) => void,
): CliHandlers => ({
  run: async (command) => {
    await autoOpenDashboardForRun({
      hubUrl: command.hubUrl,
      open: command.open,
    });
    stderr("watchtower run is not implemented yet.");
    return 1;
  },
  hubStart: notImplemented("watchtower hub start", stderr),
  hubStop: notImplemented("watchtower hub stop", stderr),
  hubStatus: notImplemented("watchtower hub status", stderr),
  open: notImplemented("watchtower open", stderr),
});

export const dispatchCli = async (
  argv: readonly string[],
  options: DispatchOptions = {},
) => {
  const stdout = options.stdout ?? console.log;
  const stderr = options.stderr ?? console.error;
  const handlers = options.handlers ?? createDefaultHandlers(stderr);
  const [command, subcommand, ...rest] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    stdout(helpText);
    return 0;
  }

  if (command === "run") {
    const args = argv.slice(1);
    let mainPath: string | undefined;
    let hubUrl: string | undefined;
    let open = true;

    for (let index = 0; index < args.length; index += 1) {
      const argument = args[index];

      if (argument === "--no-open") {
        open = false;
        continue;
      }

      if (argument === "--hub") {
        const value = args[index + 1];

        if (value === undefined) {
          stderr(`Missing required value: --hub <url>\n\n${helpText}`);
          return 1;
        }

        hubUrl = value;
        index += 1;
        continue;
      }

      if (mainPath === undefined) {
        mainPath = argument;
        continue;
      }

      stderr(`Unexpected argument: ${argument}\n\n${helpText}`);
      return 1;
    }

    if (mainPath === undefined) {
      stderr(`Missing required argument: <main.ts>\n\n${helpText}`);
      return 1;
    }

    return handlers.run({
      name: "run",
      mainPath,
      hubUrl,
      open,
    });
  }

  if (command === "hub") {
    if (subcommand === "start") {
      return handlers.hubStart({
        name: "hub start",
        detach: rest.includes("--detach"),
      });
    }

    if (subcommand === "stop") {
      return handlers.hubStop({
        name: "hub stop",
      });
    }

    if (subcommand === "status") {
      return handlers.hubStatus({
        name: "hub status",
      });
    }
  }

  if (command === "open") {
    return handlers.open({
      name: "open",
    });
  }

  stdout(helpText);
  return 1;
};
