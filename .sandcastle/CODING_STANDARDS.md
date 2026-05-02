# Coding Standards

These standards apply to every change a reviewer evaluates. They prioritise
two things: **architectural depth** (so the codebase stays navigable and
testable) and **domain fidelity** (so the code reads in the same vocabulary
as `CONTEXT.md` and the issue tracker).

## Domain vocabulary is non-negotiable

Watchtower has a glossary in `CONTEXT.md`. Every domain concept named in
code (variable, function, type, module, log line, error message) must use
the term as defined there:

- **Hub** (not server, web, daemon, backend)
- **Dashboard** (not frontend, UI, web app)
- **Runner** (not CLI, agent runner, executor)
- **Project** (not repo, workspace)
- **Job** (not campaign, session, batch, invocation)
- **Task** (not issue, ticket, work item)
- **Run** (not execution, attempt, call, invocation)
- **Event** (not log line, message, output)
- **Agent** / **Agent Provider** (not model, AI, LLM / not agent kind, agent type)
- **Sandbox Provider** (not sandbox backend, runtime)
- **Template** (not workflow, pattern)
- **Completion Signal** (not done marker, completion token, completion event)
- **Local** / **Hybrid** / **Cloud** (not Mode A/B/C, local-local, cloud-cloud, SaaS)

If a concept you need isn't in the glossary yet, that's a signal — either
you're inventing language the project doesn't use (reconsider) or there's a
real gap (note it in the issue or PRD rather than ad-libbing a new term).

## Architecture: depth over surface area

Treat every module — function, class, file, package — as having an
**interface** (everything a caller must know to use it: types, invariants,
ordering, error modes, configuration) and an **implementation** (everything
inside).

A module is **deep** when a lot of behaviour sits behind a small interface.
It is **shallow** when the interface is nearly as complex as the
implementation. Deep modules are the goal. They give callers leverage (more
behaviour per unit of interface they have to learn) and concentrate
maintenance in one place (fix once, fixed everywhere).

Concrete rules:

- **Apply the deletion test before adding a new module.** Imagine deleting
  it. If complexity vanishes, it was a pass-through and shouldn't exist. If
  complexity reappears across multiple callers, it earns its keep.
- **The interface is the test surface.** Tests cross the same seam as
  callers. If a useful test would have to reach past the interface, the
  module is the wrong shape — redesign before adding test-only hooks.
- **Don't extract pure functions purely for testability.** If the bug
  surface lives in how a function is called, not in the function itself,
  the extraction loses locality and the test loses meaning. Test the real
  call site instead.
- **One adapter is a hypothetical seam. Two adapters is a real one.** Do
  not introduce an interface to swap behaviour unless something actually
  varies across it (typically: production + test, or two real backends like
  `docker()` vs `podman()` for sandboxes). A single-implementation
  interface is just indirection.
- **Hide internal seams.** A deep module may compose smaller pieces
  internally — that's fine. Don't expose those pieces at the external
  interface just because the implementation uses them.
- **Three similar lines is not a duplication.** Wait until the shape is
  stable before extracting an abstraction. Premature abstractions ossify
  the wrong interface and cost more than they save.

## Module boundaries (this codebase)

Watchtower's process model has three durable seams. New code lives at one
of them, not straddling two:

- **Hub** — the long-lived process that exposes the HTTP API, persists
  state, and serves the Dashboard.
- **Dashboard** — the user-facing UI surface within the Hub, opened in a
  browser. Communicates with the Hub via the Hub's HTTP API.
- **Runner** — the short-lived per-invocation process that intercepts
  sandcastle imports, executes the user's `main.ts`, and pushes Events to
  the Hub.

If a change feels like it needs to live in two of these at once, that's a
signal a deeper module is missing — not an excuse to duplicate logic.

## ADR discipline

If your change makes or contradicts an architectural decision, surface it:

- Net-new architectural decision → propose an ADR in `docs/adr/`.
- Contradicts an existing ADR → don't silently override. Note the conflict
  in the PR or issue comment so a human can decide whether to amend the ADR
  or reject the change.

## Style

- Formatter and linter: TBD as the project sets up Biome / equivalent. Once
  `bun run lint` exists, it must pass. Never bypass.
- TypeScript, strict mode. Avoid `any` and unsafe casts; if you need an
  escape hatch, document the reason inline.
- Named exports over default exports.
- Comments explain **why**, never what. If the code's intent isn't
  obvious, prefer renaming or restructuring before reaching for a comment.
  Reserve comments for genuine non-obviousness: hidden constraints, subtle
  invariants, deliberate workarounds.
- No emojis in source, tests, or commit messages.
- Conventional commits: `<type>(<scope>): <description>`. Pick a scope
  that already appears in recent `git log`; if there is none yet, name the
  watchtower component (`hub`, `dashboard`, `runner`, `cli`, `docs`).

## Testing

- Tests assert **observable behaviour through the interface**, not
  internal state. A test that has to change every time the implementation
  changes is testing past the interface and should be rewritten or
  deleted.
- Test names read as behaviour descriptions, not implementation
  descriptions. "merges streaming Events in arrival order" beats "calls
  reduce on the events array."
- When a deepened module replaces several shallow ones, **delete the old
  unit tests** once the interface-level tests cover the same ground.
  Layered tests rot.
- For Runner ↔ Hub interactions, prefer testing the real wire format over
  mocking the transport.

## Validation discipline

- Validate at system boundaries: Hub HTTP entry points, Runner stdin/event
  ingestion, anything that crosses a process boundary.
- Do **not** add error handling, fallbacks, or defensive validation for
  scenarios that cannot happen given the boundary's invariants. Dead
  branches obscure the real failure surface and inflate the interface.

## Verification before commit

If a `bun run check` script exists, that's the gate — it should run lint,
typecheck, tests, and any project-specific gates. Run it before committing.

If `check` does not exist yet, run whichever of `bun run lint`,
`bun run typecheck`, `bun run test` are defined. Every commit produced by
an agent must pass them.
