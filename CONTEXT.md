# Watchtower

Watchtower is a visualization layer that wraps `sandcastle` to give a multi-run dashboard for parallel, sandboxed AI coding agents — solving the interleaved-stdout problem when you run many agents concurrently.

## Language

### Process model

**Hub**:
The long-lived process that exposes the HTTP API, persists state, and serves the Dashboard.
_Avoid_: server, web, daemon, backend.

**Dashboard**:
The user-facing UI surface within the Hub, opened in a browser.
_Avoid_: frontend, UI, web app.

**Runner**:
The short-lived per-invocation process that intercepts sandcastle imports, executes the user's `main.ts`, and pushes Events to the Hub.
_Avoid_: CLI, agent runner, executor.

### Run hierarchy

**Project**:
A user-owned codebase identified by its git remote URL (with local path as fallback).
_Avoid_: repo, workspace.

**Job**:
One `watchtower run main.ts` invocation, scoped to a single Project, containing all Runs that happen inside that process.
_Avoid_: campaign, session, batch, invocation.

**Task**:
A unit of work extracted from a planner Run's `<plan>` JSON output, typically mapping to one issue + branch.
_Avoid_: issue, ticket, work item.

**Run**:
One call to `sandcastle.run()` or `sandbox.run()`, belonging to a Job and optionally linked to a Task.
_Avoid_: execution, attempt, call, invocation.

**Iteration**:
The bounded unit inside a Run that succeeds or fails — corresponds to one outer "do this until done" loop. A Run has ≥1 Iterations. Most Runs are one-shots (one Iteration); multi-iteration Runs only exist for retry/repair workflows (e.g. ralph loops).
_Avoid_: attempt, retry, cycle.

**Turn**:
A single LLM cycle inside an Iteration — derived from the Event stream (a new Turn starts on each assistant `text` Event; tool-call Events belong to the most recent Turn). Turns are **unbounded** — never expose a "turns / max" counter. We do not persist Turns; the Dashboard computes them at read time.
_Avoid_: step, loop, llm-call, message.

### Sandcastle terminology

**Agent**:
The AI doing the actual work inside a sandbox (Claude Code, Codex, etc.), selected per-Run via the Agent Provider.
_Avoid_: model, AI, LLM.

**Agent Provider**:
The factory that produces an Agent (`claudeCode(...)`, `codex(...)`); determines what data we can capture (e.g. tokens are Claude-only).
_Avoid_: agent kind, agent type.

**Sandbox Provider**:
The factory that produces the isolated execution environment (`docker()`, `podman()`, `vercel()`, `noSandbox()`).
_Avoid_: sandbox backend, runtime.

**Template**:
A sandcastle workflow shape (`blank`, `simple-loop`, `sequential-reviewer`, `parallel-planner`, `parallel-planner-with-review`); determines whether a Job has Tasks (planner-driven) or just flat Runs.
_Avoid_: workflow, pattern.

**Completion Signal**:
The text marker an Agent emits to signal it finished cleanly (e.g. `<promise>COMPLETE</promise>`), distinguishing "agent finished" from "hit max iterations."
_Avoid_: done marker, completion token, completion event.

### Capture

**Event**:
A timestamped data point in a Run's append-only stream — sandcastle's `text` and `toolCall` outputs, plus lifecycle markers (run started, run completed, etc.).
_Avoid_: log line, message, output.

### Deployment

**Local**:
Local Runner + local Hub. V1 default.
_Avoid_: Mode A, local-local.

**Hybrid**:
Local Runner + cloud Hub — the local machine still executes sandcastle; the cloud Hub aggregates and shares the Dashboard.
_Avoid_: Mode B, local-cloud, tethered.

**Cloud**:
Cloud Runner + cloud Hub — Watchtower runs sandcastle on the user's behalf.
_Avoid_: Mode C, cloud-cloud, SaaS.

## Relationships

- A **Hub** serves many **Projects**.
- A **Project** has many **Jobs**.
- A **Job** has many **Runs**.
- A **Job** optionally has many **Tasks** (planner-driven **Templates** only).
- A **Run** belongs to exactly one **Job**, optionally to one **Task**.
- A **Run** has ≥1 **Iterations**.
- An **Iteration** has N **Turns** (unbounded, derived).
- An **Iteration** has many **Events**.
- A **Run** has many **Events** (each Event belongs to one Iteration).
- A **Run** uses exactly one **Agent Provider** and one **Sandbox Provider**.
- A **Runner** executes exactly one **Job** (1:1).
- A deployment is one of **Local**, **Hybrid**, or **Cloud**.

## Example dialogue

> **Dev**: "The Dashboard shows three Runs in this Job — but the planner extracted four issues. What happened to the fourth?"
>
> **Domain expert**: "The fourth Task is still pending. Tasks get registered when the planner Run emits its `<plan>` JSON, and a Run links to a Task when its `promptArgs.TASK_ID` matches. The fourth Task hasn't had an implementer Run start yet."
>
> **Dev**: "If I cancel the Job, do all the in-flight Runs get cancelled?"
>
> **Domain expert**: "Yes — the Hub pushes a cancel command to the Runner, which fires `AbortController.abort()` on every active Run. Each Run then gracefully tears down via sandcastle's abort path, and the Events stream records the cancellation."
>
> **Dev**: "Does the Run record what Agent Provider was used? I want to filter the Dashboard for Codex Runs only."
>
> **Domain expert**: "Yes — every Run captures its Agent Provider. The Dashboard can filter on it. Note that token data is only present for Claude — Codex Runs show no tokens."

## Flagged ambiguities

- **"Run" is overloaded.** Capital-R **Run** is the watchtower domain entity (one per `sandcastle.run()` invocation). Lowercase "run" or `sandcastle.run()` refers to the upstream function call. The CLI subcommand `watchtower run` is the verb that produces a **Job** — it does not produce a single **Run**.

- **"Task" vs "issue".** The planner's `<plan>` JSON uses the field name `issues`. Watchtower stores them as **Tasks**. Treat the planner JSON as the wire format and **Task** as the domain concept; not every Project uses GitHub Issues.

- **The conceptual category a Run plays** (planner / implementer / reviewer / merger / worker) is **not** formalized. It is expressed via sandcastle's user-supplied `name` field, which watchtower does not prescribe. Refer to it as `name` directly; do not introduce "role", "type", or "kind" as glossary terms.
