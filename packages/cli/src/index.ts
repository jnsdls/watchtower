export const cliPackageName = "@watchtower/cli";

export type {
  CliCommand,
  CliHandlers,
  DispatchOptions,
  HubStartCommand,
  HubStatusCommand,
  HubStopCommand,
  OpenCommand,
  RunCommand,
} from "./cli-dispatch.ts";
export { dispatchCli } from "./cli-dispatch.ts";
