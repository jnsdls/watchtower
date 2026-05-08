# Watchtower-specific theme tokens replace shadcn defaults

The Hub initially shipped with the default shadcn token set
(`--background`, `--card`, `--muted-foreground`, `--accent`, `--ring`)
because we used shadcn-style scaffolding. The frozen Dashboard design
specifies a Watchtower-specific token system organised around status
(`--st-running`, `--st-succeeded`, `--st-failed`, `--st-canceled`, each
with `-bg` and `-bd` variants), surface tiers
(`--bg`, `--bg-elev`, `--card`, `--card-soft`, `--hover`), text levels
(`--fg`, `--fg-soft`, `--muted`, `--muted-2`), accent
(`--accent`, `--accent-bg`, `--accent-bd`), and provider tints
(`--pv-claude`, `--pv-codex`). We chose to replace the shadcn token set
wholesale rather than layer or alias, because (1) the design's status
family is load-bearing and has no shadcn equivalent, (2) the Hub uses
exactly one shadcn component (Button) which we control, and (3) two
parallel token systems would invite drift.

## Considered options

- **Layer both** — keep shadcn tokens, add design tokens alongside.
  Two parallel systems in `globals.css`; component code has to choose
  between them; nothing to gain since the Hub doesn't pull in external
  shadcn libraries.
- **Alias** — rename design tokens to shadcn names so existing classes
  resolve to design values. Buys nothing in practice over replacement
  and obscures the design's vocabulary at the call site.
- **Stay on shadcn** — closest to today; loses the status family the
  design depends on (every status pill, every Gantt bar, the live
  stripe).
- **Wholesale replacement** *(chosen)* — single source of truth, design
  vocabulary at the call site, one place to update.

## Consequences

- `packages/hub/src/app/globals.css` is rewritten to install the design
  tokens (extracted from `docs/design/project/tokens.jsx`) on `:root`
  for light and `.dark` for dark. The `<html class="dark">` toggle
  mechanism (already wired via `@custom-variant dark`) is preserved;
  the design's prototype-only `.wt[data-theme]` wrapper is dropped.
- Tailwind v4's `@theme inline` block maps the CSS variables to
  utilities so `bg-card`, `text-fg`, `text-muted`, `border-border`,
  `bg-st-running-bg`, `text-st-running`, etc. work in className
  attributes.
- Geist Sans + Geist Mono are loaded via `next/font/google` and bound
  to `--font-sans` / `--font-mono`. Tailwind's `font-sans` / `font-mono`
  resolve to Geist.
- The single shadcn `<Button>` (`packages/hub/src/components/ui/button.tsx`)
  is rebuilt against the design's `wt-btn` semantics
  (`primary` / `ghost` / `danger` variants) using `class-variance-authority`.
- Future shadcn-library installs require an adapter step (mapping the
  shadcn tokens the library expects to the design's tokens). We expect
  this to be rare; Watchtower's UI is intentionally narrow.
- Accent colour is hardcoded to purple for V1; the design's
  magenta-purple and sentinel-sky alts are unused until the Tweaks /
  Settings surface lands in V1.5+.
- Status colours (sky / emerald / rose / amber) are encoded once in the
  token file; every component reads from the variables, so a future
  palette change is a single-file edit.
