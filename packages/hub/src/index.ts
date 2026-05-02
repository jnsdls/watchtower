export const hubPackageName = "@watchtower/hub";

export {
  createHubDatabase,
  createInMemoryHubDatabase,
  defaultPgDataDir,
  defaultWatchtowerHome,
} from "./db/client";
export { ingestEventBatch } from "./ingestion";
