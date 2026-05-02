import { type SandcastleModule, wrapSandcastleModule } from "./wrapper.ts";

const log = (message: string) => {
  console.error(message);
};

export const createLoaderHubClient = () => ({
  registerRunStart: () => crypto.randomUUID(),
  recordRunEvent: () => {},
  recordRunComplete: () => {},
  recordPlannerOutput: () => {},
});

export const wrapForLoader = <TModule extends SandcastleModule>(
  realModule: TModule,
): TModule =>
  wrapSandcastleModule(realModule, {
    hubClient: createLoaderHubClient(),
    logCall: (call) => {
      log(
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
