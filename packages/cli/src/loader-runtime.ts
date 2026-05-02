import { createConfigSnapshot } from "./config-snapshotter.ts";
import { createWatchtowerHubClient } from "./hub-client.ts";
import { installSigintHandler } from "./signals.ts";
import {
  abortActiveRuns,
  type SandcastleModule,
  wrapSandcastleModule,
} from "./wrapper.ts";

installSigintHandler({ abortActiveRuns });

export const createLoaderHubClient = () => {
  if (!process.env.WATCHTOWER_JOB_ID || !process.env.WATCHTOWER_HUB_URL) {
    return {
      registerRunStart: () => crypto.randomUUID(),
      recordRunEvent: () => {},
      recordRunComplete: () => {},
      recordPlannerOutput: () => {},
    };
  }

  return createWatchtowerHubClient({
    hubUrl: process.env.WATCHTOWER_HUB_URL,
    jobId: process.env.WATCHTOWER_JOB_ID,
  });
};

export const wrapForLoader = <TModule extends SandcastleModule>(
  realModule: TModule,
): TModule =>
  wrapSandcastleModule(realModule, {
    hubClient: createLoaderHubClient(),
    snapshotConfig: (options) =>
      createConfigSnapshot(options as Record<string, unknown>),
    logCall: (call) => {
      console.error(
        JSON.stringify({
          source: "watchtower",
          event: "sandcastle-call",
          functionName: call.functionName,
          name: call.name,
          optionsKeys: call.optionsKeys,
        }),
      );
    },
  });
