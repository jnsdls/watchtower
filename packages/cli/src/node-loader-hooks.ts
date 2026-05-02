import { createWrappedSandcastleModuleSource } from "./loader-module-source.ts";

type HookData = {
  readonly realSandcastleUrl: string;
  readonly wrapperRuntimeUrl: string;
};

let hookData: HookData | undefined;

export const initialize = (data: HookData) => {
  hookData = data;
};

export const resolve = async (
  specifier: string,
  _context: object,
  nextResolve: (
    specifier: string,
    context?: object,
  ) => Promise<{ url: string }>,
) => {
  if (specifier === "@ai-hero/sandcastle") {
    return {
      shortCircuit: true,
      url: "watchtower:sandcastle",
    };
  }

  return nextResolve(specifier);
};

export const load = async (
  url: string,
  _context: object,
  nextLoad: (
    url: string,
    context?: object,
  ) => Promise<{ format?: string; source?: string | ArrayBuffer }>,
) => {
  if (url === "watchtower:sandcastle") {
    if (hookData === undefined) {
      throw new Error("Watchtower Node loader was not initialized.");
    }

    return {
      format: "module",
      shortCircuit: true,
      source: createWrappedSandcastleModuleSource(hookData),
    };
  }

  return nextLoad(url);
};
