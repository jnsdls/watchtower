
export * from "file:///Users/jnsdls/Code/personal/watchtower/node_modules/.bun/@ai-hero+sandcastle@0.5.7+914ad07175b288ab/node_modules/@ai-hero/sandcastle/dist/index.js";
import * as realSandcastle from "file:///Users/jnsdls/Code/personal/watchtower/node_modules/.bun/@ai-hero+sandcastle@0.5.7+914ad07175b288ab/node_modules/@ai-hero/sandcastle/dist/index.js";
import { wrapForLoader } from "file:///Users/jnsdls/Code/personal/watchtower/packages/cli/src/loader-runtime.ts";

const wrappedSandcastle = wrapForLoader(realSandcastle);

export const run = wrappedSandcastle.run;
export const createSandbox = wrappedSandcastle.createSandbox;
