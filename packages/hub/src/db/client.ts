import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type HubDatabase = PgliteDatabase<typeof schema> & {
  $client: PGlite;
};
export type HubTransaction = Parameters<
  Parameters<HubDatabase["transaction"]>[0]
>[0];
export type HubQueryDatabase = HubDatabase | HubTransaction;

export const defaultWatchtowerHome = () =>
  process.env.WATCHTOWER_HOME ?? join(homedir(), ".watchtower");

export const defaultPgDataDir = () => join(defaultWatchtowerHome(), "pgdata");

export const createHubDatabase = (
  dataDir = defaultPgDataDir(),
): HubDatabase => {
  mkdirSync(dataDir, { recursive: true });
  return drizzle({ connection: { dataDir }, schema });
};

export const createInMemoryHubDatabase = (): HubDatabase =>
  drizzle({ client: new PGlite(), schema });
