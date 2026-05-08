# Job titles default to the git commit subject

The Dashboard's Job header H1 is a one-line, sentence-cased description
of what the Job is for (e.g. `fix: idempotent cart total when promo + tax
+ zero qty`). Watchtower has no place to source this from — Jobs are
just process invocations. We chose to capture `git log -1 --format=%s` at
Job start in the CLI, send it via `job.started`, and persist it as
`jobs.title` (nullable). Users can override with `watchtower run main.ts
-m "..."`. When neither is available (non-git repo, detached HEAD, git
unavailable), the UI falls back to `Job <shortId>`. The trade-off is
that the title can lie when the working tree is dirty or mid-rebase, but
that's the same lie `git status` tells, and `-m` is the escape hatch.

## Considered options

- **`-m` CLI flag only** — explicit, never wrong, but asks the user to
  remember to type it on every Job. Most Jobs are launched ambiently and
  would render as `Job <shortId>`.
- **Sandcastle-level `jobLabel: "..."`** — pollutes the sandcastle API
  for a watchtower presentation concern.
- **LLM-derived summary at Job end** — produces the most accurate title
  (knows what the Job actually did), but requires the Hub to grow its
  own LLM client + credential surface, and the title only exists after
  the Job completes. Deferred to a separate V1.5+ ADR; the schema design
  here doesn't block it.
- **Drop the H1 entirely** — Job header becomes id + status only. Loses
  the semantic anchor that makes a Job recognisable a day later in the
  Project list.
- **Git commit subject + `-m` override** *(chosen)* — auto-captures
  what's already there, override is one-flag-away, schema admits a later
  LLM upgrade without migration.

## Consequences

- Schema gains `jobs.title text` (nullable). No `titleSource` column in
  V1; if the LLM-derived path lands later we add it then.
- The CLI shells out to `git log -1 --format=%s` at Job start. Failure
  modes (no git, detached HEAD, no commits, command unavailable) all
  resolve to `null`; never crash the Job startup.
- `jobStartedEventSchema` in `packages/hub/src/ingestion/index.ts` gains
  an optional `title` field. Existing producers that don't send it
  continue to work; old Jobs in the database render the fallback.
- The Hub does not gain an LLM client or credentials in V1. When
  LLM-derived refinement ships, it overwrites the same `jobs.title`
  column from a separate code path; a `jobs.titleSource` enum
  (`commit` | `manual` | `derived`) gets added at that time if needed
  to disambiguate.
- The fallback `Job <shortId>` uses the first 6 hex chars of the Job
  UUID — same display rule as Run ids elsewhere in the Dashboard.
