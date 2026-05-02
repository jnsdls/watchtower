import { homedir } from "node:os";
import { join } from "node:path";

export const defaultHubPort = "7777";

export const getWatchtowerHome = (env: NodeJS.ProcessEnv = process.env) =>
  env.WATCHTOWER_HOME ?? join(homedir(), ".watchtower");

export const getHubUrl = (input: {
  env?: NodeJS.ProcessEnv;
  hubUrl?: string;
}) => {
  const env = input.env ?? process.env;

  if (input.hubUrl) {
    return input.hubUrl;
  }

  if (env.WATCHTOWER_URL) {
    return env.WATCHTOWER_URL;
  }

  return `http://127.0.0.1:${env.WATCHTOWER_PORT ?? defaultHubPort}`;
};
