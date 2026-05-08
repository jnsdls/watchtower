# Run inner-loop state (iteration status, turns) is derived, not ingested

The Dashboard surfaces multi-iteration history with per-iteration status,
and groups the Run event timeline by Turn. Neither iteration status nor
Turn is persisted: `iterations` rows hold tokens + timing only, and the
schema has no Turn entity. We chose to derive both at read time from the
existing event stream rather than extend ingestion, the iterations table,
or the Runner. Turn count = number of assistant `text` Events inside the
iteration; iteration status follows ralph-loop semantics — every
iteration except the last must have failed (otherwise the loop would have
stopped) and the last takes the Run's status. The trade-off is that this
inference holds for ralph-loop-shaped multi-iteration Templates and would
need to be revisited if a non-ralph shape (e.g. parallel iterations)
appears.

## Considered options

- **Explicit lifecycle Events** — the Runner emits `iteration.started`,
  `iteration.completed` (with status), and `turn.started`. Cleanest data
  model; requires upstream Runner work and an ingest path we don't need
  yet.
- **Persist derived values** — write iteration status and turn count
  back to the iterations table at `run.completed`. Keeps the read path
  simple but duplicates the inference into the ingest pipeline and
  doesn't help live (in-flight) Runs, which still need to derive.
- **Read-time derivation** *(chosen)* — keeps the database lean,
  same code path for live and historical Runs, no Runner change.

## Consequences

- The iterations table stays a per-iteration token+session cache, written
  terminally at `run.completed`. Live Runs have zero iteration rows; the
  Dashboard reads from events grouped by `payload.iteration` instead.
- Turn boundaries are computed in `packages/hub/src/db/queries.ts` (or a
  sibling) when assembling Run-detail data. A new assistant `text` Event
  opens a Turn; tool-call Events stick to the most recently opened Turn.
- Codex-emitted streams may not produce `text` Events with the same
  cadence as Claude — the Turn count for Codex Runs is best-effort.
- The ralph-loop status inference is documented as a property of the
  iteration semantics, not a heuristic. If a Template lands where
  iterations can succeed without halting the loop (e.g. parallel
  exploration), we graduate to explicit `iteration.started` /
  `iteration.completed` Events and add an `iterations.status` column.
- The Dashboard's iteration switcher and turn rail render the same way
  for live and terminal Runs — no special code path for "still running."
