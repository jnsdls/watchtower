# Drop the Bun Source-Rewrite

The CLI's bun runtime path of `runWithLoader` will keep its on-disk
source-rewrite (`createBunTransformedEntry` + the orphan-sweep helper) for the
foreseeable future. We are not deleting it in favor of a `Bun.plugin`-only
strategy.

## Background

The bun path currently does two things to wrap `@ai-hero/sandcastle`:

1. A `Bun.plugin` registered via `--preload` (in `bun-loader-register.ts`)
   with `onResolve` + `onLoad` filters for `@ai-hero/sandcastle`, returning
   the wrapped module source from `createWrappedSandcastleModuleSource`.
2. A source-to-source rewrite (`createBunTransformedEntry` in `runner.ts`)
   that reads the user's main entry, replaces the literal
   `"@ai-hero/sandcastle"` specifier with a `file://` URL pointing at a
   sibling wrapper file, writes both files into `dirname(mainPath)`, and
   runs bun against the transformed entry.

Strategy 2 is what makes the bun matrix pass for entry-file imports. The
on-disk artifacts have caused real pain (orphan files riding into `main`
via t3 checkpoint commits when `process.exit(130)` / SIGTERM / crashes
bypass the `finally`-only cleanup), so the architectural question was: can
we delete strategy 2 and rely on strategy 1 alone?

## Why this is out of scope

Empirically, on `bun 1.3.13` (the version we ship against), `Bun.plugin`
registered through `--preload` does **not** intercept an entry-file
`import "@ai-hero/sandcastle"`. The entry resolves to the real package,
not the plugin-provided in-memory wrapper. This was verified against
both `.mjs` and `.ts` entries with a minimal direct repro:

```sh
tmp=$(mktemp -d)
mkdir -p "$tmp/node_modules/@ai-hero/sandcastle"
printf %s '{"name":"@ai-hero/sandcastle","type":"module","version":"0.5.7","exports":{".":"./index.mjs"}}' \
  > "$tmp/node_modules/@ai-hero/sandcastle/package.json"
printf %s 'export const run = async () => ({ wrapped: false });\n' \
  > "$tmp/node_modules/@ai-hero/sandcastle/index.mjs"
printf %s 'import * as s from "@ai-hero/sandcastle";\nconsole.log(JSON.stringify(await s.run()));\n' \
  > "$tmp/main.mjs"

bun --preload packages/cli/src/bun-loader-register.ts "$tmp/main.mjs"
# => {"wrapped":false}    (real package, not the plugin wrapper)
```

A minimal preload plugin with explicit
`build.onResolve({ filter: /^@ai-hero\/sandcastle$/, namespace: "file" }, ...)`
behaves the same — the entry import bypasses the plugin. Transitive deps
that import `@ai-hero/sandcastle` *are* intercepted, but the user's main
entry is not.

The Bun docs describe `--preload` as importing a module before other modules
load (https://bun.sh/docs/cli/run) and runtime plugins as supporting
`onResolve` / `onLoad` for matching imports
(https://bun.sh/docs/runtime/plugins), but the observed runtime behavior on
`1.3.13` does not extend that interception to the entry file. Without
strategy 2, the bun integration matrix would silently regress: the wrapper
would only apply to transitive imports, and direct `import "@ai-hero/sandcastle"`
in user code would call the unwrapped package.

So the plugin-only path is not a viable replacement under current Bun
behavior, and we keep the source-rewrite + orphan-sweep mitigation as the
single working strategy for bun.

## Mitigations already in place

The orphan-file pain was addressed tactically without removing the rewrite:

- `sweepOrphanLoaderArtifacts(mainDir)` runs at the top of
  `createBunTransformedEntry` so a hard kill self-heals on the next run
  (`packages/cli/src/runner.ts`).
- `.sandcastle/.gitignore` includes a `.watchtower-*` entry as
  defense-in-depth so any orphan that does land doesn't get checkpointed.
- The two committed orphans were removed in `4f85926`.
- Coverage: `packages/cli/src/runner.test.ts` exercises the sweep helper.

## When to revisit

Reopen this conversation if any of the following changes:

- A future Bun release documents (or an empirical test confirms) that
  `Bun.plugin` registered via `--preload` intercepts `onResolve` /
  `onLoad` for the entry file, not just transitive deps. Re-run the
  repro above against the new version.
- `@ai-hero/sandcastle` exposes a wrapping API that doesn't require
  module-graph interception (e.g. an explicit `wrap(sandcastle)` helper
  the user calls).
- We drop bun support entirely on the runtime side (extremely unlikely).

If reconsidering, delete this file, reopen #24 (or file a fresh issue
linking back to it), and treat the gate as the verification step before
removing `createBunTransformedEntry`.

## Prior requests

- #24 — "Investigate dropping the bun source-rewrite in favor of Bun.plugin alone"
