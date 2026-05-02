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
export type {
  DetachedStartResult,
  EnsureHubResult,
  HubConfig,
  HubPing,
  HubStatus,
  StopHubResult,
} from "./hub-bootstrap.ts";
export {
  ensureHubReachable,
  getHubStatus,
  openHub,
  pingHub,
  resolveHubConfig,
  startHubDetached,
  startHubForeground,
  stopDetachedHub,
} from "./hub-bootstrap.ts";
