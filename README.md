# watchtower

> **Work in progress.** This project is under active development and not yet production-ready. APIs, CLI flags, and data formats may change without notice.

A browser-based dashboard for [sandcastle](https://github.com/mattpocock/sandcastle) — the TypeScript library for orchestrating sandboxed AI coding agents. When you launch multiple agents in parallel, their stdout streams interleave into noise. Watchtower captures structured events from every run, persists them locally, and renders them in a unified real-time view so you can watch your agents work without squinting at garbled terminal output.

## What it does

- **Aggregates parallel runs** — N concurrent sandcastle processes feed into one Dashboard instead of N competing terminals
- **Streams live events** — text output, tool calls, and completion signals appear in real time via SSE
- **Tracks tasks** — automatically extracts planned work from planner-driven templates (`<plan>` JSON) and links runs to issues
- **Records history** — every run is persisted locally (pglite/embedded Postgres) for later replay and comparison
- **Graceful cancellation** — abort in-flight runs from the Dashboard without killing the process
- **Multi-agent support** — works with Claude Code and Codex; captures token usage where available

## Architecture

Watchtower is a bun workspace monorepo with three packages:

| Package | Role |
|---------|------|
| `packages/hub` | Next.js app — serves the Dashboard UI and a REST + SSE API; stores data in pglite |
| `packages/cli` | CLI binary — wraps your sandcastle script via a runtime loader hook (Bun or Node), captures events, and forwards them to the Hub |
| `packages/protocol` | Shared TypeScript types for the wire format between CLI and Hub |

The Hub runs as a long-lived background process (port 7777 by default). The CLI is per-invocation and re-uses the same Hub across many runs.

## Requirements

- [Bun](https://bun.sh) ≥ 1.2
- Node.js ≥ 22
- A sandcastle script to run (see [sandcastle docs](https://github.com/mattpocock/sandcastle))

## Usage

> The CLI is not yet published to npm. See [Development](#development) to run it from source.

### 1. Start the Hub

```bash
watchtower hub start --detach
```

This starts the Next.js server on `http://127.0.0.1:7777` and returns immediately. Open the URL in your browser — you'll see the Dashboard. Drop `--detach` to run the Hub in the foreground (useful when iterating on the Hub itself). Use `watchtower hub stop` to shut down a detached Hub, or `watchtower hub status` to check whether one is reachable.

### 2. Run your sandcastle script

```bash
watchtower run .sandcastle/main.ts
```

Watchtower injects a loader hook into the sandcastle process that captures events and forwards them to the Hub. The Dashboard updates live as the run progresses.

### 3. Watch

Navigate the Dashboard:

- **Home** — list of projects and recent jobs
- **Job detail** — all parallel runs for a job, Gantt-style timeline
- **Run detail** — full event stream, token usage, produced commits, cancel button

## Development

### Setup

```bash
git clone https://github.com/jnsdls/watchtower.git
cd watchtower
bun install
```

### Run the Hub locally

```bash
bun --filter @watchtower/hub dev
```

The Hub dev server starts on `http://127.0.0.1:7777` with hot reload.

### Run the CLI from source

The CLI binary lives at `packages/cli/src/bin.ts`. Either invoke it directly:

```bash
bun packages/cli/src/bin.ts <command>
```

or expose `watchtower` on your `PATH` from this checkout:

```bash
bun link               # in this repo
bun link watchtower    # in any sandcastle project that should use this build
```

### Test your sandcastle integration

Copy `.sandcastle/.env.example` to `.sandcastle/.env` and fill in your credentials:

```bash
cp .sandcastle/.env.example .sandcastle/.env
```

Then run the example script:

```bash
bun run sandcastle
```

### Checks

```bash
bun run check       # typecheck + lint + tests
bun run typecheck
bun run lint
bun test
```

### Database migrations

The Hub stores everything in `~/.watchtower/pgdata/` ([pglite](https://github.com/electric-sql/pglite), an embedded Postgres). Delete that directory to reset local state. If you change the Hub schema:

```bash
bun --filter @watchtower/hub drizzle:generate   # generate migration files
bun --filter @watchtower/hub drizzle:migrate    # apply locally
```

## Project status

Watchtower is **early-stage and evolving**. The V1 architecture is settled and documented in [`docs/architecture.md`](docs/architecture.md) and the [ADRs](docs/adr/). Core implementation is underway.

**V1 scope (in progress):**
- Local Hub + Dashboard
- Loader-hook Runner
- Task extraction from planner runs
- SSE live updates
- Graceful cancellation
- History persistence

**Not yet started (V2+):**
- Published npm packages
- Cloud Hub mode
- Run comparison view
- Dependency graph visualization

Expect breaking changes. Issues and feedback welcome.

## Documentation

- [`CONTEXT.md`](CONTEXT.md) — domain glossary (Hub, Runner, Project, Job, Run, Task, Iteration, Turn, Event). Read this first; it's the language used everywhere else.
- [`docs/architecture.md`](docs/architecture.md) — long-form V1 design doc covering the data capture path, deployment modes, and rejected alternatives.
- [`docs/adr/`](docs/adr/) — architectural decision records for the load-bearing choices (Next.js for the Hub, SSE+HTTP transport, Bun+Node from day one, derived Iteration/Turn state, design tokens).
- [`docs/design/`](docs/design/) — frozen Dashboard design handoff (HTML/CSS/JSX prototypes). Read before re-implementing or adding screens.
- [`AGENTS.md`](AGENTS.md) — pointers for AI agents working in this repo (`CLAUDE.md` is a symlink to it).

## License

MIT — see the `license` field in [`package.json`](package.json).
