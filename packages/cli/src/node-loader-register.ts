import { register } from "node:module";

const realSandcastleUrl =
  process.env.WATCHTOWER_SANDCASTLE_URL ??
  import.meta.resolve("@ai-hero/sandcastle");
const wrapperRuntimeUrl = new URL("./loader-runtime.ts", import.meta.url).href;

register(new URL("./node-loader-hooks.ts", import.meta.url), {
  data: {
    realSandcastleUrl,
    wrapperRuntimeUrl,
  },
  parentURL: import.meta.url,
});
