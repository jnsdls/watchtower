import { type SandcastleModule, wrapSandcastleModule } from "./wrapper.ts";

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
