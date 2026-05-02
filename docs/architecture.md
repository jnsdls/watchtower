# Watchtower — V1 Architecture & Design

> **Status:** Design phase. No code written yet. This doc is the output of
> two grilling sessions: the first walked the architectural design tree
> (§6.1–§6.10); the second resolved the implementation-layer decisions
> (§6.11–§6.19) — framework, transport, packages, ORM, toolchain, CLI
> surface. Three ADRs cover the genuine pivots:
> [0001 Next.js for Hub](./adr/0001-nextjs-for-hub.md),
> [0002 SSE + HTTP transport](./adr/0002-sse-and-http-transport.md),
> [0003 Bun + Node from day 1](./adr/0003-bun-and-node-from-day-one.md).
> This doc is intended to be self-contained so a fresh session can pick
> up implementation without re-doing the research.

---

## 1. What is Watchtower?

Watchtower is a visualization layer that wraps Matt Pocock's
[`sandcastle`](https://github.com/mattpocock/sandcastle) — a TypeScript
library that orchestrates sandboxed AI coding agents. Sandcastle's headline
feature is parallelizing N agents in isolated sandboxes (Docker / Podman /
Vercel microVMs) to work on a backlog of issues.

Sandcastle ships with a single-process Clack-based stdout TUI, but that TUI
breaks when you actually do what sandcastle is for: run many agents in
parallel via `Promise.all`. Their output streams interleave and become
unreadable.

**Watchtower V1 is a separate, long-lived Dashboard that aggregates many
concurrent sandcastle runs into one screen, plus history.**

The product wedge is "watch your AFK agents work" — a vantage point on
parallel agent activity that sandcastle's own UI structurally cannot give
you. Local-first today; cloud-hosted later.

---

## 2. The Three Deployment Modes (Roadmap)

The architecture is the same primitive in all three modes. Only the runner's
target URL and authentication differ.

- **Local (V1 default).** Local Runner pushes events to a
  local Hub at `localhost:N`. Browser opens local Dashboard.
  This is the "for myself" case the user wants first.

- **Hybrid (V2).** Local Runner pushes to
  `https://watchtower.com/api/...` with an auth token. Sandcastle still
  runs on the user's machine (their Docker, their dev env, their API
  keys, their git repo) but the Dashboard lives in the cloud. Useful for
  watching from a phone, sharing with teammates, or off-machine history.

- **Cloud (V2+).** A managed Runner container at
  watchtower.com runs sandcastle on the user's behalf. Full SaaS: user
  connects a repo, watchtower executes. Sandbox Provider becomes
  `vercel()` (Firecracker microVMs) instead of `docker()`.

Hybrid is the natural gateway-drug product (free local execution + paid
cloud Dashboard). Cloud is the full SaaS endgame.

The V1 architecture must not paint us into a corner that requires
re-architecting for Hybrid/Cloud. It doesn't, by construction: see §6.

---

## 3. Background — What Sandcastle Actually Is

Sandcastle is a TypeScript library invoked programmatically from a script,
typically `.sandcastle/main.ts` (or `main.mts`). It is **not a daemon** and
not a CLI workflow tool — it is a function library.

### 3.1 Core API surface

```typescript
import { run, createSandbox, claudeCode, codex } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

await run({
  agent: claudeCode("claude-opus-4-6"),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
  maxIterations: 5,
  name: "implementer",
  promptArgs: { TASK_ID: "42" },
  signal: abortController.signal,           // graceful cancel
  logging: {
    type: "file",
    path: ".sandcastle/logs/run.log",
    onAgentStreamEvent: (event) => { ... }, // event forwarding
  },
});
```

Two run-style entry points:

- `run(options)` — single-shot. Creates a sandbox, runs an agent up to
  `maxIterations` times, returns a `RunResult`.
- `createSandbox(options)` — multi-call. Returns a `Sandbox` you can
  invoke `sandbox.run(...)` on multiple times (e.g. implement-then-review
  on the same branch / container). Closes via `await using` or
  `sandbox.close()`.

There is also `interactive(options)` which launches an interactive TUI
session (used less in production workflows; out of scope for watchtower V1).

### 3.2 Agent providers (multi-agent, important for V1)

Sandcastle is **agent-agnostic.** Built-in providers:

- `claudeCode("claude-opus-4-6", { effort })` — Claude Code via
  Anthropic API.
- `codex("gpt-5.5", { effort })` — OpenAI Codex.
- More providers expected over time.

This kills any V1 design that depended on Claude-specific data sources
(e.g., reading `~/.claude/projects/<encoded>/*.jsonl` session files
directly). Watchtower must work for Codex users too.

**Key implication: token usage is Claude-only.** From sandcastle's
CHANGELOG entry `148905b`: *"Expose per-iteration token usage on
IterationResult via a new usage?: IterationUsage field. Returns raw token
counts for Claude Code runs. **Non-Claude agent providers return
undefined.**"* This is an upstream limitation, not a watchtower one.
Watchtower shows tokens for Claude runs and shows "—" or "n/a" for Codex
runs.

### 3.3 Sandbox providers

- `docker()` — bind-mount, local. Most common for dev.
- `podman()` — bind-mount, rootless. Linux-friendly.
- `vercel()` — isolated microVMs. Cloud.
- `noSandbox()` — runs on host (interactive only).

You can also create custom providers via `createBindMountSandboxProvider`
or `createIsolatedSandboxProvider`. The `vercel()` provider is what cloud
mode would use.

### 3.4 Logging & the data we can capture

Two logging modes:

- `logging: { type: "stdout" }` — Clack interactive TUI (single-process,
  what watchtower replaces in spirit).
- `logging: { type: "file", path: "...", onAgentStreamEvent?: (e) => void }`
  — write to a log file AND optionally fire a callback per stream event.

The `onAgentStreamEvent` callback is the agent-agnostic structured
event source. Event shape (from `src/AgentStreamEmitter.ts`):

```typescript
type AgentStreamEvent =
  | { type: "text"; message: string; iteration: number; timestamp: Date }
  | { type: "toolCall"; name: string; formattedArgs: string;
      iteration: number; timestamp: Date };
```

These events are normalized across agent providers — Codex tool calls and
Claude tool calls both surface as `{ type: "toolCall", name, formattedArgs }`.
This is the right capture point for watchtower.

### 3.5 The result object

After `run()` resolves, we get an `OrchestrateResult` (see
`src/Orchestrator.ts`):

```typescript
interface IterationResult {
  sessionId?: string;
  sessionFilePath?: string;
  usage?: IterationUsage;  // Claude only
}

interface IterationUsage {
  inputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  outputTokens: number;
}

interface OrchestrateResult {
  iterations: IterationResult[];
  completionSignal?: string;
  stdout: string;            // <-- the planner's <plan> JSON lives here
  commits: { sha: string }[];
  branch: string;
  preservedWorktreePath?: string;
}
```

Key pieces watchtower extracts from this:
- `iterations.length` — actual iteration count
- `iterations[i].usage` — token counts (Claude only, undefined for Codex)
- `commits` — git SHAs the agent produced
- `branch` — what branch was worked on
- `completionSignal` — was the completion signal hit, or did we hit
  `maxIterations`?
- `stdout` — full text output, **needed for parsing planner `<plan>` JSON**

### 3.6 Cancellation

`run()` accepts `signal: AbortSignal`:

> *"If signal.aborted is already true at entry, run() rejects.
> Aborting mid-iteration kills the in-flight agent subprocess.
> Phase boundaries (between iterations) also check the signal.
> The rejected promise surfaces signal.reason via signal.throwIfAborted().
> The worktree is preserved on disk after abort (error-path behavior)."*

This is exactly what we need for graceful cancel-from-Dashboard. Whoever
calls `run()` owns the AbortController and can cancel it. **An out-of-process
observer cannot cancel.** This was the deciding factor against pure
log-tailing observation.

---

## 4. Sandcastle Templates (Cross-Template Conventions)

Five official templates ship with sandcastle (`src/templates/`):

| Template                       | Phases | run() calls per outer iter | Has planner? | Parallel? | Named roles |
|--------------------------------|--------|---------------------------|--------------|-----------|-------------|
| `blank`                        | 1      | 1                         | No           | No        | (none)      |
| `simple-loop`                  | 1      | 1                         | No           | No        | `worker`    |
| `sequential-reviewer`          | 2      | 2                         | No           | No        | `implementer`, `reviewer` |
| `parallel-planner`             | 3      | 1 + N + 1                 | **Yes**      | **Yes**   | `planner`, `implementer`, `merger` |
| `parallel-planner-with-review` | 4      | 1 + 2N + 1                | **Yes**      | **Yes**   | `planner`, `implementer`, `reviewer`, `merger` |

The user's repo (`~/code/nebula-desktop`) uses the
`parallel-planner-with-review` template, with one tweak: codex
(`gpt-5.5`) for the implementer instead of claude-sonnet. Otherwise
structurally identical to the upstream template.

### 4.1 Cross-template conventions watchtower can rely on

These conventions are **stable across the official templates** and
unlikely to change:

- **`name` field** on every `run()` call. Conventional values:
  `worker`, `implementer`, `reviewer`, `planner`, `merger`. Used as the
  log filename suffix and as a display label.
- **`promptArgs` keys.** The planner-driven templates use:
  `TASK_ID`, `ISSUE_TITLE`, `BRANCH`, `BRANCHES`, `ISSUES`. The
  implementer/reviewer receive a single task; the merger receives lists.
- **Planner output schema.** Both `parallel-planner` and
  `parallel-planner-with-review` instruct the planner to emit:

  ```
  <plan>
  {"issues": [{"id": "42", "title": "Fix auth bug",
               "branch": "sandcastle/issue-42-fix-auth-bug"}]}
  </plan>
  ```

  The user's `main.ts` parses this from `result.stdout` to drive
  parallel execution. Watchtower uses the same hook to extract tasks.

### 4.2 Why this matters for watchtower's data model

Tasks are first-class in the planner-driven templates. Watchtower can
auto-extract the task graph from the planner's `<plan>` JSON without
requiring users to add any code. Templates without planners (the other
three) just see flat-runs-by-`name`. **One mechanism, graceful
degradation across all five templates.**

---

## 5. Sample Real Data (from `~/code/nebula-desktop/.sandcastle/`)

### 5.1 The user's `main.ts` (verbatim, paraphrased to highlight structure)

```typescript
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const MAX_ITERATIONS = 10;
const hooks = { sandbox: { onSandboxReady: [{ command: "bun install --frozen-lockfile" }] } };
const copyToWorktree = ["node_modules"];

const dockerSandbox = () => docker({
  mounts: [
    { hostPath: "~/.codex/auth.json",   sandboxPath: "/home/agent/.codex/auth.json" },
    { hostPath: "~/.codex/config.toml", sandboxPath: "/home/agent/.codex/config.toml", readonly: true },
  ],
});

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  // PHASE 1: Plan (claude-opus, 1 iteration)
  const plan = await sandcastle.run({
    hooks, sandbox: dockerSandbox(),
    name: "planner",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-6"),
    promptFile: "./.sandcastle/plan-prompt.md",
  });

  const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
  const { issues } = JSON.parse(planMatch[1]!) as {
    issues: { id: string; title: string; branch: string }[];
  };

  // PHASE 2: Implement + Review per issue, in parallel
  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch, sandbox: dockerSandbox(), hooks, copyToWorktree,
      });
      try {
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: sandcastle.codex("gpt-5.5", { effort: "medium" }),       // <-- Codex!
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: { TASK_ID: issue.id, ISSUE_TITLE: issue.title, BRANCH: issue.branch },
        });
        if (implement.commits.length > 0) {
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: sandcastle.claudeCode("claude-opus-4-7", { effort: "high" }),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: { BRANCH: issue.branch },
          });
          return { ...review, commits: [...implement.commits, ...review.commits] };
        }
        return implement;
      } finally { await sandbox.close(); }
    }),
  );

  // PHASE 3: Merge (claude-opus, 1 iteration)
  await sandcastle.run({
    hooks, sandbox: dockerSandbox(),
    name: "merger",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-6"),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completedBranches.map(b => `- ${b}`).join("\n"),
      ISSUES:   completedIssues.map(i => `- ${i.id}: ${i.title}`).join("\n"),
    },
  });
}
```

So one process invocation produces, in the worst case:
`10 outer iterations × (1 planner + N parallel (implementer, reviewer) + 1 merger)` = many tens of `sandcastle.run()` calls.

### 5.2 Real sandcastle text log structure

A merger log (Claude Opus 4.6) looks like:

```
--- Run started: 2026-04-30T20:50:27.969Z ---
Iteration 1/100
Setting up sandbox
Setting up sandbox done (0.2s)
Expanding shell expressions
  git log -n 10 --format="%H%n%ad%n%B---" --date=short -> ~717 tokens
Expanding shell expressions done (0.1s)
Agent started
I'll merge each branch sequentially, resolving any conflicts...
Bash(git merge sandcastle/issue-255-channel-optimistic-user-message --no-edit)
Fast-forward merge for issue 255. Running checks.
Bash(bun run check 2>&1)
All checks pass. Merging the next branch.
...
<promise>COMPLETE</promise>
Agent stopped
Capturing session
Collecting commits
Collecting commits done (0.0s)
Agent signaled completion after 1 iteration(s).
Run complete: agent finished after 1 iteration(s).
Context window: 23k                                            <-- Claude only
```

Important details:
- One log file per `name` value, accumulating runs over time. The
  `--- Run started: <ISO> ---` line is the run boundary.
- `Context window: NNNk` lines are written **only for Claude agents**
  (per the CHANGELOG). Codex runs have no such line. Older sandcastle
  versions (pre `148905b`) didn't write them at all.
- Tool calls render as `ToolName(args)`, one per line.
- `<promise>COMPLETE</promise>` is the default completion signal.

**These logs are a UX artifact, not an API contract.** The format has
already changed once (`148905b` added the `Context window` line) and
will continue to evolve. **Watchtower V1 does NOT parse these logs.**
We capture structured events through the loader-wrapped sandcastle API
instead. (See §6.)

---

## 6. Architectural Decisions (with rationale)

The grilling session resolved ten architectural branches. Each is
recorded here with the options considered, the rationale, and the
choice — so future sessions know not just what we picked but why.

### 6.1 What gap does watchtower fill?

**Decision: multi-run Dashboard (separate process, aggregating N concurrent
runs into one screen).**

Sandcastle's built-in stdout TUI is single-process / single-run. With
`Promise.all([run(), run(), ...])`, the Clack renders interleave and
become unusable. Watchtower aggregates many concurrent runs into one
view. Other options considered: persistent observatory, richer single-run
view, ops console — all defensible but multi-run is the most direct gap.

### 6.2 How does watchtower acquire run data?

**Decision: watchtower owns the integration via a runner pattern (loader-
wrapped sandcastle), not pure log parsing.**

Pure log parsing was tempting because logs already exist on disk. We
reasoned it through:

1. **Tokens.** Initially I thought tokens weren't in the logs. The user
   pushed back ("I remember seeing them in the merger output"), and
   they were right — `Context window: 23k` lines exist in current
   sandcastle versions, for Claude agents only. Tokens *are* in the
   logs.
2. **Cancel.** External observers cannot graceful-cancel a run; they
   can only `kill` the process or `docker kill` the container, which
   skips sandcastle's cleanup paths.
3. **Stability.** The user's deciding insight: *"the logs aren't
   guaranteed to be stable. They might change over time and the format
   might change. Maybe it's better to just own it."* Sandcastle's
   logs are a UX artifact and have already changed once. Watchtower
   coupling to them means silent breakage on every sandcastle release.

So we own the integration. Watchtower's CLI (`npx watchtower run main.ts`)
is the entry point. A loader hook intercepts `@ai-hero/sandcastle`
imports and substitutes wrapped versions. The wrappers:

- Forward `onAgentStreamEvent` to watchtower's daemon (text + tool calls).
- Capture `result.iterations[].usage` (tokens, Claude only).
- Register an `AbortController` with the daemon for graceful cancel.
- Snapshot config at run start (see §6.6).
- For `name: "planner"` runs, parse `<plan>` JSON from `result.stdout`
  and register tasks with the daemon.

User's `main.ts` is unmodified. They just change how they run it:
`bun .sandcastle/main.ts` becomes `npx watchtower run .sandcastle/main.ts`.

Other options considered:
- Adapter package the user imports (`@watchtower/sandcastle` instead
  of `@ai-hero/sandcastle`) — clean for local but doesn't work for
  cloud (Cloud mode) where users won't edit their `main.ts`. Cloud forces
  the runner pattern anyway, so we converge on it now.
- Hybrid (observer + opt-in adapter) — rejected by user: "I really
  just want one way for users to do this, not multiple."

### 6.3 UI: TUI or browser?

**Decision: browser-based Dashboard (at `localhost:N` in Local mode, hosted at
`watchtower.com` in Cloud mode).**

User's reasoning: *"we can build the Dashboard locally and run it on
localhost. We can spin up a small web server."* Single Dashboard
codebase for local + cloud. Richer than a TUI (diff previews, charts,
parallel-stream UI, scrubbing). The local Hub is universally
accessible — open in any browser.

### 6.4 Process model: daemon vs per-run?

**Decision: two-process model — `watchtower hub` (long-lived, started
independently) and `watchtower run main.ts` (short-lived, per-invocation).
No auto-spawned daemon; instead, prompt the user if the Hub isn't running.**

The user explicitly rejected auto-spawned daemon as "overkill." Their
preferred shape: `watchtower run` is per-run; the Hub is its own thing,
started independently. UX mitigation: when `watchtower run` is
invoked and the Hub isn't reachable, prompt with `Y/n` to spin
it up as a separate process.

This matches cloud architecture exactly:
- **Local:** Runner pushes events to local Hub → pglite.
- **Cloud:** Runner (in user's container) pushes events to the Hub at
  `watchtower.com` → Postgres. Same code path.

### 6.5 Scope: single-project or multi-project per instance?

**Decision: multi-project per instance.**

One Hub per machine (or per cloud user). Data lives at
`~/.watchtower/pgdata/` (locally) or in cloud Postgres. Dashboard has
a project picker. Each `watchtower run` identifies its project by git
remote URL (with fallback to repo path).

Reasons: it's free with the architecture (the Hub is already independent of
runs; making it serve N projects is a column on the runs table). Matches
the user's actual workflow (multiple sibling repos under `~/code/`).
Cloud is unambiguously multi-project (a user's account has all their
repos). Single-project locally would create UX divergence with cloud.

### 6.6 Run hierarchy / grouping?

**Decision: job auto-detected from process invocation + auto-task-
extraction from planner output. One mechanism, graceful degradation
across all five templates.**

The user's pushback was sharp: iterations are sandcastle plumbing and
don't matter to humans. Tasks (issues) and dependencies do. After
researching the templates, we found:

- 2 of 5 official templates have planner-driven workflows that emit
  `<plan>{ issues: [{id, title, branch}] }</plan>` JSON. The user's
  `main.ts` uses one of these.
- 3 of 5 templates have no task concept (single-shot or
  implement-then-review pairs).

So watchtower:

1. **Always:** treats one `npx watchtower run` invocation as one
   *job*. All `sandcastle.run()` / `sandbox.run()` calls within
   that process are children.
2. **Always:** records each run with its `name` and `promptArgs`
   metadata.
3. **Opportunistically:** when a run with `name === "planner"`
   completes, parse `<plan>...</plan>` JSON from `result.stdout`. If
   parsing succeeds, register tasks under the job. Subsequent
   runs whose `promptArgs.TASK_ID` matches a registered task are
   linked.
4. **Gracefully degrades:** templates without planners get flat-runs-
   by-`name` within their job. No tasks.

For the Dashboard's Gantt-chart view: tasks become Y-axis swimlanes
when present (runs nest under their task); when there's no planner,
swimlanes are runs grouped by `name`. Same component, both modes.

**On dependency graphs:** the current `<plan>` schema only emits
unblocked tasks (the planner filters internally). We don't get an
explicit dep graph. We can *infer* dependencies temporally (task #271
appearing in iteration 3 after #254/#255 merged in iteration 1
suggests #271 depended on them). A real dep graph is V2.

### 6.7 What config metadata does V1 capture per run?

**Decision: capture liberally — full run options (JSON blob), prompt
files (raw template + resolved post-substitution), `.sandcastle/` content
hash, parent git SHA.**

The user's stated V2 aspiration: *"I changed something in my Sandcastle
config and runs are running more efficiently now"* and the auto-
improvement-loop with human-in-the-loop. For V2 to deliver this, V1
must capture the data at run-time — backfilling from git history later
is messy.

Snapshot per run:

```jsonc
{
  "options": { /* the full options object passed to sandcastle.run() */ },
  "prompts": {
    "raw": {
      "implement-prompt.md": "...verbatim template content...",
      ...
    },
    "resolved": {
      "implement-prompt.md": "...post-promptArgs+shell-expansion...",
      ...
    }
  },
  "promptArgs": { "TASK_ID": "254", ... },
  "sandcastleDirHash": "sha256:...",
  "parentCommitSha": "abc123...",
  "capturedAt": "2026-04-30T20:50:27.969Z"
}
```

Storage cost: prompt templates are 1-3 KB each. Even 10K runs is
~30 MB. Fine.

Why both raw and resolved prompts: comparing raw across runs tells you
*"did I edit my prompt?"* Comparing resolved across runs tells you
*"did substitutions cause meaningful changes?"* Both are useful for V2.

### 6.8 Local DB engine?

**Decision: pglite (embedded Postgres via WASM) for local. Managed
Postgres for cloud.**

The user raised the dual-engine concern: SQLite local + Postgres cloud
means two schemas to maintain, subtle semantic differences (JSON
handling, dates, booleans), and migration pain. They suggested
Postgres-via-Docker as an alternative.

[pglite](https://github.com/electric-sql/pglite) is the magic third
option — Postgres compiled to WASM, embedded in-process, 3 MB gzipped,
no Docker required. Production-mature in 2026 (13M weekly downloads,
v0.4 in March 2026, Prisma bundles it in their CLI). Same SQL dialect
as cloud Postgres. One schema, one set of migrations, one set of
queries.

Caveats: single-process, memory-constrained, no horizontal scaling.
None matter for watchtower local (single user, single project at a
time, MB of run history).

Storage location: `~/.watchtower/pgdata/` (pglite is a directory of
files, not a single file like SQLite).

Migration to cloud Postgres: schema is already Postgres-shaped. No
semantic translation needed.

### 6.9 Cancel mechanism?

**Decision: graceful cancel via `signal: AbortSignal` (because we own
the runtime in the runner pattern).**

The Dashboard's cancel-button POSTs to the Hub. Hub marks the Run as
`cancel_requested=true`. The Runner (which holds an open long-poll
GET to `/api/runs/:runId/cancel` per active Run — see §6.12) observes
the resolved response and calls `controller.abort()` on the
AbortController it holds for that Run. Sandcastle then gracefully
cleans up — kills the in-flight agent subprocess, preserves the
worktree on disk, returns through the abort path.

`docker kill` and SIGTERM remain available as last-resort emergency
cancels but are not the primary path. Ctrl+C in the `watchtower run`
terminal short-circuits the Hub round-trip: the Runner has direct
access to its AbortControllers and fans out `abort()` immediately
(§6.17).

### 6.10 Three deployment modes off one core

**Decision: V1 ships Local. Hybrid and Cloud are unlocked by config (the
Runner takes a `WATCHTOWER_URL`, defaults to `localhost`, env-overridable
for Hybrid; Cloud runs sandcastle in a managed Runner container).** No
architectural commitment to Hybrid/Cloud beyond ensuring V1 doesn't paint
us into a corner.

It doesn't, by construction: the Runner-to-Hub link is just an HTTP
endpoint. Whatever URL it's pointed at (localhost, watchtower.com, or
an internal cloud-runner address), the protocol is the same.

### 6.11 Hub framework

**Decision: Next.js (App Router) for the Hub, with the Dashboard
frontend co-located in the same project.** See [ADR
0001](./adr/0001-nextjs-for-hub.md). One project gives us route
handlers + streaming responses (the SSE basis) + the Dashboard build
pipeline; matches maintainer fluency. Trade-off: no native WebSocket
in route handlers, which forces the SSE/HTTP transport in §6.12.

### 6.12 Transport

**Decision: SSE + HTTP throughout. No WebSocket.** See [ADR
0002](./adr/0002-sse-and-http-transport.md). Concretely:

| Direction | Endpoint | Transport |
|---|---|---|
| Runner → Hub events | `POST /api/events` | Batched HTTP POST (~100ms windows) |
| Hub → Runner cancels | `GET /api/runs/:runId/cancel` | Long-poll, one open per active Run |
| Hub → Dashboard live updates | `GET /api/stream` | SSE (`text/event-stream`) |
| Hub → Dashboard queries | `GET /api/...` | REST |

The earlier "WebSocket per run" sketch (now removed from §10) is
superseded. Browser `EventSource` provides auto-reconnect; the SSE
handler must support `Last-Event-ID` resume.

**V2 cloud cost note:** on Vercel Fluid Compute, SSE connections incur
~$0.011/hr per open connection in provisioned memory (active CPU is
free during I/O wait). Pro plan caps function duration at 800s, forcing
~13-min reconnect cycles. V1 local hosting has none of these concerns;
V2 deployment-target is portable (Fly, Railway, Render all work).

### 6.13 Runner runtime support

**Decision: Bun + Node both supported from V1.** See [ADR
0003](./adr/0003-bun-and-node-from-day-one.md). The loader hook lives
behind a runtime-detection abstraction covering `Bun.plugin({setup})`
and Node's `module.register`. The watchtower binary detects the user's
runtime and re-execs `main.ts` under the same runtime so existing
scripts continue to work. The Hub itself runs on Node (Next.js's
primary supported runtime).

### 6.14 Workspaces and packages

**Decision: bun workspaces with three packages.**

| Package | Role |
|---|---|
| `packages/cli` | The watchtower binary. CLI commands + Runner role + loader hook. |
| `packages/hub` | The Next.js project. API routes, Dashboard pages, pglite + Drizzle. |
| `packages/protocol` | Shared wire-format types (Event shapes, HTTP/SSE message contracts). |

`cli` and `hub` will publish on independent cadences when Cloud lands.
`protocol` is internal-only for V1, published when third-party Runners
become a thing.

**Package names use `@watchtower/*` as private placeholders** until the
product name is finalized — `"private": true` in every `package.json`
so nothing accidentally publishes. Renaming later is a sed across the
repo.

### 6.15 Database access

**Decision: Drizzle ORM with the pglite driver locally; same code with
the cloud-Postgres driver in V2.** Schema as a TypeScript file
(`packages/hub/src/db/schema.ts`); migrations via `drizzle-kit`. The
pglite→Postgres swap is a 1-line driver change.

### 6.16 Toolchain

| Concern | Choice |
|---|---|
| Lint + format | Biome (single tool, fast, opinionated) |
| Tests | Vitest (works in Bun and Node; jsdom for Dashboard tests) |
| TypeScript | `strict: true` with `noUncheckedIndexedAccess: true` |
| Node version floor | ≥ 22 LTS (stable `module.register`) |
| Bun version floor | ≥ 1.2 |

### 6.17 CLI surface and defaults

**Decision: minimal V1 surface plus convention-based defaults.**

| Subcommand | Behavior |
|---|---|
| `watchtower run <main.ts>` | Loader-hook execution. Auto-opens Dashboard on first run (`--no-open` to suppress). Prompts Y/n to spawn detached Hub if unreachable. Ctrl+C: graceful first press (fan out `controller.abort()` to every active Run, mark Job `canceled`); hard kill on second press. |
| `watchtower hub start [--detach]` | Foreground by default; `--detach` for background. |
| `watchtower hub stop` | Stops a detached Hub via PID file. |
| `watchtower hub status` | Pings the Hub; prints reachability + version + URL. |
| `watchtower open` | Opens the Dashboard in the default browser. |

Defaults:

| Setting | Default |
|---|---|
| Hub port | `7777` |
| Bind address | `127.0.0.1` (localhost only — single-user safe) |
| Data directory | `~/.watchtower/` |
| pglite | `~/.watchtower/pgdata/` |
| PID file (detached Hub) | `~/.watchtower/hub.pid` |
| Hub log (detached Hub) | `~/.watchtower/hub.log` |
| Hub URL env override | `WATCHTOWER_URL` |
| Hub port env override | `WATCHTOWER_PORT` |
| Data dir env override | `WATCHTOWER_HOME` |
| CLI flag for Hub URL | `--hub <url>` on `run` |

Dashboard home route (`/`): project list.

Deferred to V1.5+: `hub logs`, `hub restart`, `jobs ls`, `projects ls`,
`runs ls`. Useful once history accumulates; not blocking V1.

### 6.18 UI conventions

**Decision: Tailwind CSS + shadcn/ui.** Components copy-pasted into
`packages/hub/src/components/ui/`. No runtime CSS-in-JS; full
customization room for the bespoke Gantt + live-event surfaces.

### 6.19 Sandcastle dependency, sanitization, license

- **Sandcastle dependency:** declared as `peerDependency` with a `>=`
  floor at the version that introduced `IterationUsage` (commit
  `148905b`). Watchtower runtime-checks the resolved version on Runner
  startup and errors loudly if too old.
- **`config_snapshot` sanitization:** walk the `options` object; replace
  non-JSON-safe values with typed placeholder strings (`[Function]`,
  `[AbortSignal]`, `[ReadableStream]`, etc.). Predictable, debuggable,
  no silent data loss. Applied before `JSON.stringify` for the snapshot.
- **License:** MIT.

---

## 7. V1 Architecture Diagram

```
+----------------------------------------------------------+
|  watchtower hub - Next.js (App Router) - long-lived      |
|  +----------------------------------------------------+  |
|  |  Dashboard pages - Tailwind + shadcn/ui            |  |
|  +----------------------------------------------------+  |
|  +----------------------------------------------------+  |
|  |  Route handlers:                                   |  |
|  |  - POST /api/events                  (from Runner) |  |
|  |  - GET  /api/runs/:runId/cancel      (long-poll)   |  |
|  |  - GET  /api/stream                  (SSE -> UI)   |  |
|  |  - GET  /api/...                     (REST queries)|  |
|  +----------------------------------------------------+  |
|  +----------------------------------------------------+  |
|  |  Drizzle ORM -> pglite at ~/.watchtower/pgdata/    |  |
|  |  (cloud V2: Drizzle -> managed Postgres,           |  |
|  |   1-line driver swap)                              |  |
|  |  Schema: projects, jobs, tasks, runs,              |  |
|  |          iterations, events, commits, config       |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
                          ^
                          |  HTTP to WATCHTOWER_URL
                          |  (default http://127.0.0.1:7777;
                          |   env-overridable for Hybrid/Cloud)
                          |
+----------------------------------------------------------+
|  watchtower run main.ts (per-invocation, short-lived)    |
|  Bun + Node, runtime-detected                            |
|  +----------------------------------------------------+  |
|  |  Loader hook: intercepts @ai-hero/sandcastle       |  |
|  |  imports, substitutes wrapped versions             |  |
|  |  - Bun.plugin({setup}) on Bun                      |  |
|  |  - module.register / --import on Node              |  |
|  +----------------------------------------------------+  |
|  +----------------------------------------------------+  |
|  |  Wrapped run() / createSandbox():                  |  |
|  |  - registers AbortController for cancel            |  |
|  |  - forwards onAgentStreamEvent (POST /api/events)  |  |
|  |  - long-polls GET /api/runs/:runId/cancel          |  |
|  |  - captures result.iterations[].usage              |  |
|  |  - snapshots config at start (typed placeholders   |  |
|  |    for non-JSON values)                            |  |
|  |  - parses <plan> JSON from planner runs            |  |
|  +----------------------------------------------------+  |
|  +----------------------------------------------------+  |
|  |  User's main.ts (UNMODIFIED)                       |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
```

---

## 8. Data Model (sketch)

```sql
-- One per (git_remote_url || local_path).
projects (
  id              uuid primary key,
  git_remote_url  text,
  local_path      text,
  display_name    text,
  created_at      timestamptz
);

-- One per `npx watchtower run main.ts` invocation.
jobs (
  id              uuid primary key,
  project_id      uuid references projects(id),
  started_at      timestamptz,
  ended_at        timestamptz,
  status          text,           -- running | succeeded | failed | canceled
  process_pid     integer,        -- for orphan reaping (V1.5+)
  watchtower_version text
);

-- Optional: populated by planner extraction.
-- Templates without planners produce zero rows here.
tasks (
  id              uuid primary key,
  job_id          uuid references jobs(id),
  external_id     text,           -- e.g. "254"
  title           text,
  branch          text,
  status          text,           -- pending | implementing | reviewing | merged | failed
  created_at      timestamptz
);

-- One per sandcastle.run() / sandbox.run() call.
runs (
  id              uuid primary key,
  job_id          uuid references jobs(id),
  task_id         uuid references tasks(id),       -- nullable
  name            text,                            -- planner | implementer | reviewer | merger | ...
  agent_provider  text,                            -- claudeCode | codex | ...
  agent_model     text,                            -- claude-opus-4-6 | gpt-5.5 | ...
  sandbox_provider text,                           -- docker | podman | vercel | noSandbox
  branch          text,
  max_iterations  integer,
  started_at      timestamptz,
  ended_at        timestamptz,
  status          text,                            -- running | succeeded | failed | canceled
  completion_signal text,                          -- which signal fired, or NULL
  config_snapshot jsonb,                           -- full options + prompts + hashes
  error_message   text                             -- when status=failed
);

-- One per agent-loop iteration within a run.
iterations (
  id              uuid primary key,
  run_id          uuid references runs(id),
  n               integer,                         -- iteration number, 1-indexed
  started_at      timestamptz,
  ended_at        timestamptz,
  -- Token usage (Claude only; NULL for Codex)
  input_tokens                integer,
  output_tokens               integer,
  cache_read_input_tokens     integer,
  cache_creation_input_tokens integer,
  -- Sandcastle session linkage
  session_id        text,
  session_file_path text
);

-- Append-only event stream for live updates and replay.
events (
  id              uuid primary key,
  run_id          uuid references runs(id),
  iteration_id    uuid references iterations(id),  -- nullable (run-level events)
  type            text,                            -- text | toolCall | status | ...
  payload         jsonb,
  timestamp       timestamptz
);

-- Commits produced by a run.
commits (
  id              uuid primary key,
  run_id          uuid references runs(id),
  sha             text
);
```

`config_snapshot` jsonb shape: see §6.7.

---

## 9. V2 Backlog (parked during grilling)

These are deferred but the V1 data model captures enough to enable
them without retrofitting:

- **Auto-modify `planner.md` at runtime** to request richer outputs
  (full dep graph, ETAs, blocking annotations). Watchtower would
  inject prompt enhancements before the planner runs.
- **Comparison view.** Group runs by
  `(sandcastleDirHash, agent_model, sandbox_provider)`. Surface
  token / duration / success-rate deltas across config changes. The
  user's stated use case: *"are runs more efficient after I changed
  my config?"*
- **Auto-improvement loop with human-in-the-loop.** Detect patterns
  ("hitting maxIterations 30% of the time over the last 50 runs"),
  suggest config changes, open a PR to the user's
  `.sandcastle/main.ts`, measure post-merge impact, repeat.
- **Explicit task / dep API** for non-planner setups. Watchtower
  extension to `run()` options: `task: { id, title, deps?: [] }`.
- **Auto-extraction adapters** as new sandcastle templates emerge.
- **Dependency graph visualization.** Requires either upstream
  planner changes or the explicit task API.
- **Cloud SaaS specifics:**
  - GitHub OAuth for sign-in
  - Multi-tenant isolation (per-user Postgres rows, RLS)
  - Per-user API tokens for Hybrid (local Runner -> cloud Hub)
  - Billing / pricing tiers
  - Sandbox-provider substitution in cloud (`docker()` ->
    `vercel()`) — three options sketched: (i) loader-level alias
    rewriting, (ii) require users to use a `sandcastle.sandbox()`
    indirection, (iii) auto-detect and wrap any provider.
- **Heartbeat + orphan reaping.** Runner sends heartbeats every N
  seconds; the Hub reaps runs in `running` state with no recent
  heartbeat. V1 leaves crashed runs as `running` indefinitely with
  manual cleanup; this is acceptable for v1's local-only single-user
  scope.

---

## 10. Deferred to Implementation (not architecturally controversial)

The transport, packaging, runtime, CLI surface, and database layer
have moved to §6.11–§6.19 as resolved decisions. What's left here is
the genuinely small / mechanical:

- **Cancel UX (Dashboard side).** Button in the Dashboard ->
  `POST /api/runs/:runId/cancel/request` -> Hub flips `cancel_requested`
  on the row -> long-poll handler resolves to the Runner ->
  `AbortController.abort()`. Mechanical.
- **Live-update granularity.** Batch outgoing events on the Runner
  side every ~100ms before POSTing to `/api/events`. Don't push every
  single text-chunk individually.
- **SSE resume protocol.** Hub stamps each event with a monotonic
  sequence; Dashboard sends `Last-Event-ID` on reconnect; Hub
  back-fills missed events from the DB. Mechanical — the stream
  source is already append-only.
- **Dashboard navigation hierarchy.** Project list (`/`) -> project
  detail (jobs + stats) -> job detail (Gantt + tasks + runs) -> run
  detail (events). Standard master-detail layout.

---

## 11. Open Risks / Things to Stress-Test During Implementation

- **Loader hook reliability.** `import * as sandcastle from "@ai-hero/sandcastle"`
  must resolve to the wrapped versions in both Bun and Node. Test
  matrix: Bun (user's actual runtime), Node + tsx, Node + ts-node,
  Node + native ESM. Particular risk: Bun's plugin API and Node's
  `--import` semantics differ; need to validate the wrapper sees
  `run`, `createSandbox`, all `sandbox/*` provider modules.
- **Config snapshot fidelity.** The `options` field passed to
  `sandcastle.run()` may contain non-serializable values (functions,
  AbortSignal). Need to filter/sanitize before persisting JSON.
- **Planner output parsing.** `<plan>` regex match on `result.stdout`
  is brittle if the planner emits malformed JSON or wraps in extra
  prose. Be defensive: try/catch JSON.parse, log failures, fall back
  to flat-run mode for that job.
- **Token data from non-Claude agents.** Codex provider has
  `IterationUsage = undefined`. Schema must handle nullable. Future
  agents may have different usage shapes; keep the columns
  Claude-shaped for now and add new columns when new providers ship
  usage data.
- **Cloud sandbox-provider substitution.** When Cloud runs the user's
  `main.ts` in a managed container, the `docker()` import must
  somehow become `vercel()`. Three options sketched in §9. Decide
  before building cloud, not at V1.
- **Crashed runners.** V1 leaves `running` runs in the DB indefinitely
  if the runner crashes. Acceptable for single-user local; needs
  heartbeat for multi-tenant cloud.

---

## 12. References

### Sandcastle source files examined

- [`src/AgentStreamEmitter.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/AgentStreamEmitter.ts)
  — `AgentStreamEvent` shape, the agent-agnostic structured event source.
- [`src/Display.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/Display.ts)
  — `DisplayService`, `DisplayEntry` types, file/silent/clack display
  layers. The "stdout TUI" lives here.
- [`src/Orchestrator.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/Orchestrator.ts)
  — `IterationResult`, `IterationUsage`, `OrchestrateResult`. Handles
  AbortSignal, idle timeouts, completion signal detection.
- [`src/run.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/run.ts)
  — top-level `run()` entry point, `LoggingOption`,
  `formatContextWindowSize`, `buildContextWindowLines`.
- [`src/SessionStore.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/SessionStore.ts)
  — Claude Code session JSONL handling at `~/.claude/projects/<encoded>/`.
  (Not used by V1 watchtower because it's Claude-specific.)

### Sandcastle templates examined

- [`src/templates/blank/main.mts`](https://github.com/mattpocock/sandcastle/blob/main/src/templates/blank/main.mts)
- [`src/templates/simple-loop/main.mts`](https://github.com/mattpocock/sandcastle/blob/main/src/templates/simple-loop/main.mts)
- [`src/templates/sequential-reviewer/main.mts`](https://github.com/mattpocock/sandcastle/blob/main/src/templates/sequential-reviewer/main.mts)
- [`src/templates/parallel-planner/main.mts`](https://github.com/mattpocock/sandcastle/blob/main/src/templates/parallel-planner/main.mts)
- [`src/templates/parallel-planner/plan-prompt.md`](https://github.com/mattpocock/sandcastle/blob/main/src/templates/parallel-planner/plan-prompt.md)
  — defines the `<plan>{ issues: [...] }</plan>` schema watchtower
  parses.
- [`src/templates/parallel-planner-with-review/main.mts`](https://github.com/mattpocock/sandcastle/blob/main/src/templates/parallel-planner-with-review/main.mts)
  — the user's template (with codex swapped for the implementer).

### User's reference data

- `~/code/nebula-desktop/.sandcastle/main.ts` — user's actual
  orchestration (parallel-planner-with-review + Codex implementer).
- `~/code/nebula-desktop/.sandcastle/logs/*.log` — real production
  logs to validate against during implementation. Includes both
  Claude (merger, planner, reviewer) and Codex (implementer) runs.
- `~/code/nebula-desktop/.sandcastle/{plan,implement,review,merge}-prompt.md`
  — real prompt templates.

### External

- [`mattpocock/sandcastle` README](https://github.com/mattpocock/sandcastle/blob/main/README.md)
  — public API surface.
- [`mattpocock/sandcastle` CHANGELOG](https://github.com/mattpocock/sandcastle/blob/main/CHANGELOG.md)
  — track when sandcastle's APIs evolve. Particularly relevant
  entries: `148905b` (added `IterationUsage` and `Context window`
  log line).
- [pglite](https://github.com/electric-sql/pglite) — embedded
  Postgres-via-WASM, V1's local DB engine.
- [PGlite v0.4 announcement (March 2026)](https://electric.ax/blog/2026/03/25/announcing-pglite-v04)

---

## 13. Pickup Notes for Future Sessions

**The architectural decisions in §6 are settled.** Don't re-litigate
them without strong new information. In particular:

- Don't propose pure log parsing again. The user explicitly rejected
  it for stability reasons (§6.2).
- Don't propose a Clack/TUI Dashboard. The user explicitly chose
  browser-based for cloud symmetry (§6.3).
- Don't propose adapter-as-primary-user-import. The user said "one
  way only" and we picked the runner. The adapter still exists as
  an internal mechanism but isn't a user-facing import (§6.2).
- Don't propose SQLite. We picked pglite specifically to avoid the
  dual-engine maintenance tax (§6.8).
- Don't propose Hono / Express / Fastify for the Hub. We chose
  Next.js (§6.11, ADR 0001) so the API and Dashboard live in one
  project.
- Don't propose WebSocket. We chose SSE + HTTP (§6.12, ADR 0002)
  to stay inside Next.js's native primitives. The earlier WS sketch
  in §10 has been superseded.
- Don't propose Bun-only or Node-only. Both are supported from V1
  (§6.13, ADR 0003).
- Don't propose a different ORM. We chose Drizzle (§6.15) for the
  pglite + Postgres path.

**What's open for future sessions to decide:**

- Concrete schema migrations (the §8 sketch is approximate; tighten
  during implementation, drive via `drizzle-kit`).
- The exact SSE event payload schema (typed via
  `@watchtower/protocol`); error handling and back-pressure under
  high event volume.
- The Dashboard's actual UI (we sketched navigation in §10 and
  resolved home = project list in §6.17, but didn't design specific
  screens).
- The detached-Hub spawn implementation (PID file + `nohup`-style
  detach across macOS/Linux).
- V2 features (§9) — design them only when V1 is shipping or shipped.

**Suggested first implementation milestones:**

1. **Workspaces + scaffolding.** Three packages (`cli`, `hub`,
   `protocol`) wired via bun workspaces. Biome + Vitest + strict TS
   + Node 22 / Bun 1.2 floors. Each package has a stub `index.ts`
   and a `package.json` with `"private": true`. Validates the layout
   before any logic exists.
2. **Loader hook + stub runner.** Prove `watchtower run main.ts` can
   intercept `@ai-hero/sandcastle` imports, log every wrapped call,
   and pass through. No Hub, no DB. Output to `console.log`.
   Validate on both Bun (against the user's `nebula-desktop` repo)
   and Node + tsx (a fixture).
3. **Hub skeleton (Next.js + pglite + Drizzle).** Stand up the
   Next.js app. Define the Drizzle schema for §8. Add `POST
   /api/events` that writes to pglite. Hardcode `127.0.0.1:7777`.
4. **Glue them.** Runner POSTs events to the Hub; Hub persists; basic
   `GET /api/runs` reads them back. Still no frontend logic beyond
   placeholder.
5. **Dashboard skeleton.** Project list page (`/`), basic master-
   detail navigation, no styling beyond Tailwind defaults.
6. **Live updates via SSE.** `GET /api/stream` with `Last-Event-ID`
   resume. Dashboard subscribes; events appear live.
7. **Cancel.** Dashboard button -> `POST
   /api/runs/:runId/cancel/request` -> Runner long-poll observes ->
   `AbortController.abort()`. End-to-end test.
8. **Planner extraction.** Wrap the planner-output detection; tasks
   show up in the Dashboard linked to subsequent Runs by `TASK_ID`.
9. **Polish:** Gantt view, swimlanes, drill-down, history, auto-open
   on first `watchtower run`, Ctrl+C semantics.
