# Runner runtime support: Bun + Node from day 1

The Runner (`watchtower run main.ts`) must work for any sandcastle user.
Sandcastle users include both Bun-native projects and Node + `tsx`
projects. We chose to support both runtimes from V1 rather than ship
Bun-only and add Node in V1.5. The cost is a loader-hook abstraction
covering both `Bun.plugin({setup})` and Node's `module.register` API;
the benefit is that no early adopters are excluded based on runtime.

## Considered options

- **Bun-only for V1** — cleaner single loader-hook implementation,
  smaller test matrix, matches the maintainer's own setup. Excludes
  the (likely large) population of Node + `tsx` sandcastle users.
- **Node-only** — most universal but more friction for the watchtower
  binary itself, which prefers Bun.

## Consequences

- The loader hook lives behind a runtime-detection abstraction in
  `packages/cli`.
- Test matrix: Bun and Node × {`tsx`, `ts-node`, native ESM with
  `--experimental-strip-types`}.
- The watchtower binary itself detects the user's runtime and re-execs
  `main.ts` under the same runtime so existing scripts continue to work.
- This decision applies to the Runner only. The Hub runs on Node (per
  ADR 0001).
