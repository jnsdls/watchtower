import { spawn } from "node:child_process";
import { platform } from "node:os";

export type BrowserOpener = (url: string) => Promise<void> | void;

const commandForPlatform = () => {
  if (platform() === "darwin") {
    return { command: "open", args: [] };
  }

  if (platform() === "win32") {
    return { command: "cmd", args: ["/c", "start", ""] };
  }

  return { command: "xdg-open", args: [] };
};

export const openBrowser: BrowserOpener = async (url) => {
  const { command, args } = commandForPlatform();
  const child = spawn(command, [...args, url], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
};
