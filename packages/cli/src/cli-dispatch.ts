import {
  getHubStatus,
  openHub,
  resolveHubConfig,
  startHubDetached,
  startHubForeground,
  stopDetachedHub,
} from "./hub-bootstrap.ts";
import { autoOpenDashboardForRun } from "./run-auto-open";
import { runWithLoader } from "./runner.ts";

export type RunCommand = {
  name: "run";
  mainPath: string;
  hubUrl?: string;
  title?: string;
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
  watchtower run [--hub <url>] [--no-open] [-m <title>] <main.ts>
  watchtower hub start [--detach]
  watchtower hub stop
  watchtower hub status
  watchtower open`;

const createDefaultHandlers = (
  stdout: (message: string) => void,
  _stderr: (message: string) => void,
): CliHandlers => ({
  run: async (command) => {
    await autoOpenDashboardForRun({
      hubUrl: command.hubUrl,
      open: command.open,
    });
    return runWithLoader(command.mainPath, {
      hubUrl: command.hubUrl,
      title: command.title,
    });
  },
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

    stdout(
      result.signal === "SIGKILL"
        ? `Stopped Hub pid ${result.pid} (force-killed after SIGTERM timeout).`
        : `Stopped Hub pid ${result.pid}.`,
    );
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
    const args = argv.slice(1);
    let mainPath: string | undefined;
    let hubUrl: string | undefined;
    let title: string | undefined;
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

      if (argument === "-m") {
        const value = args[index + 1];

        if (value === undefined) {
          stderr(`Missing required value: -m <title>\n\n${helpText}`);
          return 1;
        }

        title = value;
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
      title,
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
