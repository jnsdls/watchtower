import {
  getHubStatus,
  openHub,
  resolveHubConfig,
  startHubDetached,
  startHubForeground,
  stopDetachedHub,
} from "./hub-bootstrap.ts";
import { runWithLoader } from "./runner.ts";

export type RunCommand = {
  name: "run";
  mainPath: string;
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
  watchtower run <main.ts>
  watchtower hub start [--detach]
  watchtower hub stop
  watchtower hub status
  watchtower open`;

const createDefaultHandlers = (
  stdout: (message: string) => void,
  _stderr: (message: string) => void,
): CliHandlers => ({
  run: (command) => runWithLoader(command.mainPath),
  hubStart: async (command) => {
    const config = resolveHubConfig();

    if (!command.detach) {
      return startHubForeground(config);
    }

    const result = await startHubDetached(config);
    stdout(
      result.status === "already-running"
        ? `Hub already running at ${result.url} (pid ${result.pid}).`
        : `Hub started at ${result.url} (pid ${result.pid}). Logs: ${result.logPath}`,
    );
    return 0;
  },
  hubStop: async () => {
    const result = await stopDetachedHub(resolveHubConfig());

    if (result.status === "not-running") {
      stdout("Hub is not running.");
      return 0;
    }

    if (result.status === "stale") {
      stdout(`Cleared stale Hub PID file for pid ${result.pid}.`);
      return 0;
    }

    stdout(`Stopped Hub pid ${result.pid}.`);
    return 0;
  },
  hubStatus: async () => {
    const status = await getHubStatus(resolveHubConfig());

    if (status.reachable) {
      stdout(`Hub reachable at ${status.url}`);
      stdout(`Version: ${status.version}`);
      return 0;
    }

    stdout(`Hub unreachable at ${status.url}`);

    if (status.error !== undefined) {
      stdout(`Error: ${status.error}`);
    }

    return 1;
  },
  open: async () => {
    const config = resolveHubConfig();
    await openHub(config);
    stdout(`Opened Hub at ${config.url}.`);
    return 0;
  },
});

export const dispatchCli = async (
  argv: readonly string[],
  options: DispatchOptions = {},
) => {
  const stdout = options.stdout ?? console.log;
  const stderr = options.stderr ?? console.error;
  const handlers = options.handlers ?? createDefaultHandlers(stdout, stderr);
  const [command, subcommand, ...rest] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    stdout(helpText);
    return 0;
  }

  if (command === "run") {
    if (subcommand === undefined) {
      stderr(`Missing required argument: <main.ts>\n\n${helpText}`);
      return 1;
    }

    return handlers.run({
      name: "run",
      mainPath: subcommand,
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
