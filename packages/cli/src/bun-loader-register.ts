import { createWrappedSandcastleModuleSource } from "./loader-module-source.ts";

const realSandcastleUrl =
  process.env.WATCHTOWER_SANDCASTLE_URL ??
  import.meta.resolve("@ai-hero/sandcastle");
const wrapperRuntimeUrl = new URL("./loader-runtime.ts", import.meta.url).href;

Bun.plugin({
  name: "watchtower-sandcastle-loader",
  setup(build) {
    build.onResolve({ filter: /^@ai-hero\/sandcastle$/ }, () => ({
      namespace: "watchtower",
      path: "sandcastle",
    }));

    build.onLoad({ filter: /^sandcastle$/, namespace: "watchtower" }, () => ({
      contents: createWrappedSandcastleModuleSource({
        realSandcastleUrl,
        wrapperRuntimeUrl,
      }),
      loader: "js",
    }));
  },
});
