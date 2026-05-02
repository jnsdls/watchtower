import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getHubUrl, getWatchtowerHome } from "./hub-config";
import { type BrowserOpener, openBrowser } from "./open-browser";

const autoOpenStateFile = (home: string) => join(home, "dashboard-auto-opened");

export type AutoOpenDashboardOptions = {
  env?: NodeJS.ProcessEnv;
  hubUrl?: string;
  open: boolean;
  opener?: BrowserOpener;
};

export const autoOpenDashboardForRun = async ({
  env = process.env,
  hubUrl,
  open,
  opener = openBrowser,
}: AutoOpenDashboardOptions) => {
  if (!open) {
    return false;
  }

  const home = getWatchtowerHome(env);
  const stateFile = autoOpenStateFile(home);

  try {
    await readFile(stateFile, "utf8");
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await mkdir(home, { recursive: true });
  await opener(getHubUrl({ env, hubUrl }));
  await writeFile(stateFile, `${new Date().toISOString()}\n`, "utf8");

  return true;
};
