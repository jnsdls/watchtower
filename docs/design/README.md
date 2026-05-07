# Watchtower design reference

This directory is the **design source of truth** for the Watchtower Dashboard. It's a handoff bundle from Claude Design (`claude.ai/design`): HTML/CSS/JS prototypes you can read, plus the chat transcript that captured intent.

Use it when re-implementing existing Dashboard screens or building new ones. The Hub is Next.js (see `docs/adr/0001-nextjs-for-hub.md`); these prototypes are React 18 + Babel UMD. **Recreate them pixel-perfectly in the Hub stack — don't copy the prototype's internal structure unless it happens to fit.**

## How to use this as an agent

1. **Read `chats/chat1.md` first.** That's where the user's intent and resolved decisions live.
2. **Open `project/Watchtower Designs.html`** to see how the canvas wires every screen, then **follow its imports** (the `<script src=…>` list). The exact entry order is the recommended reading order.
3. **Read the JSX directly.** Dimensions, colors, layout rules are all spelled out in source. **Do not render in a browser or take screenshots unless the user asks** — a screenshot tells you nothing the source doesn't.
4. **Use `CONTEXT.md` vocabulary** when describing screens (Hub, Dashboard, Project, Job, Run, Task, Iteration, Turn, Event, Agent Provider, etc.). The chat transcript and prototypes already use these terms.
5. **Treat this directory as frozen.** Don't edit the JSX to "fix" things you spot — propose changes in code or open an issue. New designs arrive as a new handoff bundle that replaces this one.

## Design system summary

Pulled from `project/tokens.jsx` and the chat transcript. The full token set is the JSX; this is the orientation.

- **Type pairing**: Geist Sans for UI · Geist Mono for data, IDs, timestamps, durations, numerics.
- **Theme**: dark-first; light is a variant. All colors are OKLCH so the same hue keeps perceptual lightness across themes.
- **Status palette**: `running` sky · `succeeded` emerald · `failed` rose · `canceled` amber. Status drives all color in the UI; there are no decorative gradients.
- **Accent**: purple (default `#7a5af0`), with magenta-purple (`#b07af0`) and sentinel sky (`#3b8edb`) as alternates. Single accent only — never combined.
- **Live treatment** is *quiet*: pulsing dot on `running` pills, plus a barely-visible diagonal stripe on running Gantt bars. **No spinners.**
- **Density**: 30px Gantt rows · 38px table rows · 11px uppercase column headers (Linear/Vercel-flavored).
- **Mobile** is a strict subset of desktop, not a redesign — same primitives, smaller paddings.
- **Agent-provider data degrades cleanly**: token data is Claude-only; Codex Runs render `—` in the same column without a fallback chart.

## Screen inventory

The canvas is composed in `project/app.jsx`. Each screen is a React component exposed on `window`. Sections, in canvas order:

### Foundations · `project/screens-foundations.jsx`
Type · Tokens · Status · Patterns — both themes. Reference for typography ramp, color tokens, status pill anatomy, recurring patterns (kbd, metric tile, table cell, event-rail dot).

### Core screens · V1 · `project/screens-core.jsx`
- **Project list** — the four V1 screens that exist today, dark + light.
- **Project detail** — the per-project landing surface.

### Job detail · `project/screens-job.jsx`
- **Job detail** — Gantt + swimlanes (refined direction). One of two bespoke surfaces.

### Run detail · `project/screens-run.jsx`
- **Run detail · one-shot** — the common case (single iteration).
- **Run detail · multi-iteration** — iteration switcher above the timeline; only chrome-up when `iterations > 1`.
- **Tool-call · expanded** — drill-down view of a single tool call.

### V1.5 surfaces · `project/screens-extras.jsx`
- **Empty Hub** — first-run state with terminal mock + docs cards.
- **Global filters / search** · **Comparison** · **Settings** · **Sign in (cloud)**.

### ⌘K command palette · `project/screens-cmdk.jsx`
- **⌘K over Job detail** — modal mixing runs, jobs, actions, navigation in one ranked list.

### Mobile (Hybrid) · `project/screens-mobile.jsx`
- **Mobile · Job** · **Mobile · Run** — phone-sized treatment of the two surfaces users keep open while AFK.

### App shell · `project/screens-app-shell.jsx`
The chrome (top bar, breadcrumbs) reused across screens.

### Plumbing
- `project/tokens.jsx` — design tokens, primitives (`WTFrame`, `StatusPill`, `Kbd`, `Mono`, `Num`, `Logo`), inline icon set `I`.
- `project/data.jsx` — mock data shared across screens.
- `project/design-canvas.jsx` — the artboard layout (`DesignCanvas`, `DCSection`, `DCArtboard`).
- `project/tweaks-panel.jsx` — the live tweaks UI; only the **Accent** tweak ships.

## Resolved design decisions

These came up during the design conversation and matter when re-implementing. Treat them as the **canonical interpretation** of the data model and surfaces — not the prototype source code, which may not yet reflect every decision.

- **Run = ≥1 Iterations · Iteration = N Turns (unbounded).** Iteration is the bounded unit that succeeds or fails; turns just count up. **Never show a "turns / max" counter.** When `iterations > 1`, expose an iteration switcher; the token-usage and event timeline scope to the active iteration.
- **No "Add Project" button in V1.** Project list is purely a reflection of repos that have run Watchtower locally. Empty state explains the CLI command. (`Add cloud project` is V1.5+ and only when signed into the cloud tier.)
- **Run detail header mirrors Job detail rhythm.** Kicker (`RUN · r_xxxx [pill] name · iteration N · turn M`) → H1 task → meta row. Run id renders the same way as Job id.
- **Token usage table is dropped from Run detail.** The event timeline carries the same information and an iteration may have 1000s of turns.
- **Event timeline ships the "turn rail" variant only.** Stream and track variants were dropped.
- **Iterations vs LLM turns**: most tasks are one-shots. Default surfaces should prioritize turns; iterations only chrome-up when there are multiple.

## Bundle provenance

- Source: `claude.ai/design` handoff for the Watchtower Designs project.
- Original handoff README (with generic instructions) is preserved verbatim in `chats/chat1.md` context — this README replaces it with project-specific guidance.
- Uploads referenced inline by the chat live in `project/uploads/`.
