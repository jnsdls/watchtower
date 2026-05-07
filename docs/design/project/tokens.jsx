// Watchtower design tokens — OKLCH, dark-first.
// All screens read these via CSS vars on a wrapping .wt-theme-{dark,light}
// node, so every artboard can sit on the warm canvas bg without leaking.

const WTTokenStyles = `
  /* Geist comes from a <link> in the host file; fallbacks below */
  .wt {
    --font-sans: "Geist", "Geist Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;

    --r-1: 3px;
    --r-2: 5px;
    --r-3: 7px;
    --r-4: 10px;
    --r-pill: 999px;

    --s-1: 4px;
    --s-2: 8px;
    --s-3: 12px;
    --s-4: 16px;
    --s-5: 20px;
    --s-6: 24px;
    --s-8: 32px;
    --s-10: 40px;
    --s-12: 48px;

    --tx-11: 11px;
    --tx-12: 12px;
    --tx-13: 13px;
    --tx-14: 14px;
    --tx-16: 16px;
    --tx-18: 18px;
    --tx-22: 22px;
    --tx-28: 28px;

    /* Status — selected palette: sky / emerald / rose / amber */
    --st-running: oklch(0.65 0.14 232);
    --st-running-bg: oklch(0.65 0.14 232 / 0.16);
    --st-running-bd: oklch(0.65 0.14 232 / 0.42);
    --st-succeeded: oklch(0.66 0.14 158);
    --st-succeeded-bg: oklch(0.66 0.14 158 / 0.16);
    --st-succeeded-bd: oklch(0.66 0.14 158 / 0.42);
    --st-failed: oklch(0.62 0.20 17);
    --st-failed-bg: oklch(0.62 0.20 17 / 0.16);
    --st-failed-bd: oklch(0.62 0.20 17 / 0.42);
    --st-canceled: oklch(0.74 0.15 70);
    --st-canceled-bg: oklch(0.74 0.15 70 / 0.16);
    --st-canceled-bd: oklch(0.74 0.15 70 / 0.42);

    /* Agent provider tints */
    --pv-claude: oklch(0.74 0.15 60);
    --pv-codex: oklch(0.78 0.005 240);

    color-scheme: dark;
    font-family: var(--font-sans);
    font-feature-settings: "ss01", "cv11";
    font-synthesis: none;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  .wt[data-theme="dark"] {
    --bg: oklch(0.155 0.005 240);
    --bg-elev: oklch(0.185 0.006 240);
    --card: oklch(0.195 0.006 240);
    --card-soft: oklch(0.215 0.006 240);
    --hover: oklch(0.235 0.007 240);
    --border: oklch(0.275 0.007 240);
    --border-strong: oklch(0.34 0.008 240);
    --fg: oklch(0.965 0.003 240);
    --fg-soft: oklch(0.86 0.003 240);
    --muted: oklch(0.62 0.005 240);
    --muted-2: oklch(0.48 0.006 240);
    --accent: oklch(0.66 0.13 232);
    --accent-bg: oklch(0.66 0.13 232 / 0.14);
    --accent-bd: oklch(0.66 0.13 232 / 0.4);
    --grid: oklch(0.275 0.007 240 / 0.6);
    color-scheme: dark;
  }

  .wt[data-theme="light"] {
    --bg: oklch(0.985 0.002 240);
    --bg-elev: oklch(0.975 0.003 240);
    --card: oklch(1 0 0);
    --card-soft: oklch(0.98 0.002 240);
    --hover: oklch(0.965 0.003 240);
    --border: oklch(0.91 0.004 240);
    --border-strong: oklch(0.84 0.005 240);
    --fg: oklch(0.205 0.008 240);
    --fg-soft: oklch(0.32 0.007 240);
    --muted: oklch(0.5 0.006 240);
    --muted-2: oklch(0.62 0.005 240);
    --accent: oklch(0.52 0.16 232);
    --accent-bg: oklch(0.52 0.16 232 / 0.1);
    --accent-bd: oklch(0.52 0.16 232 / 0.32);
    --grid: oklch(0.91 0.004 240 / 0.7);

    /* light-mode status nudges for contrast on white surfaces */
    --st-running: oklch(0.5 0.16 232);
    --st-running-bg: oklch(0.5 0.16 232 / 0.1);
    --st-running-bd: oklch(0.5 0.16 232 / 0.34);
    --st-succeeded: oklch(0.5 0.14 158);
    --st-succeeded-bg: oklch(0.5 0.14 158 / 0.1);
    --st-succeeded-bd: oklch(0.5 0.14 158 / 0.34);
    --st-failed: oklch(0.55 0.21 17);
    --st-failed-bg: oklch(0.55 0.21 17 / 0.1);
    --st-failed-bd: oklch(0.55 0.21 17 / 0.34);
    --st-canceled: oklch(0.6 0.15 70);
    --st-canceled-bg: oklch(0.6 0.15 70 / 0.1);
    --st-canceled-bd: oklch(0.6 0.15 70 / 0.34);
    color-scheme: light;
  }

  .wt, .wt * { box-sizing: border-box; }
  .wt { background: var(--bg); color: var(--fg); }

  /* small primitives shared across screens */
  .wt-mono { font-family: var(--font-mono); font-feature-settings: "ss01", "zero"; }
  .wt-num { font-variant-numeric: tabular-nums; font-family: var(--font-mono); }
  .wt-h-rule { height: 1px; background: var(--border); }
  .wt-v-rule { width: 1px; background: var(--border); }
  .wt-row { display: flex; align-items: center; }

  /* status pill */
  .wt-pill {
    display: inline-flex; align-items: center; gap: 6px;
    height: 20px; padding: 0 7px 0 6px;
    border-radius: var(--r-pill);
    font-size: 11px; font-weight: 500; letter-spacing: 0.01em;
    border: 1px solid transparent;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .wt-pill .dot { width: 6px; height: 6px; border-radius: 50%; }
  .wt-pill[data-st="running"]    { color: var(--st-running);    background: var(--st-running-bg);    border-color: var(--st-running-bd); }
  .wt-pill[data-st="running"] .dot { background: var(--st-running); animation: wtPulse 1.6s ease-in-out infinite; }
  .wt-pill[data-st="succeeded"]  { color: var(--st-succeeded);  background: var(--st-succeeded-bg);  border-color: var(--st-succeeded-bd); }
  .wt-pill[data-st="succeeded"] .dot { background: var(--st-succeeded); }
  .wt-pill[data-st="failed"]     { color: var(--st-failed);     background: var(--st-failed-bg);     border-color: var(--st-failed-bd); }
  .wt-pill[data-st="failed"] .dot { background: var(--st-failed); }
  .wt-pill[data-st="canceled"]   { color: var(--st-canceled);   background: var(--st-canceled-bg);   border-color: var(--st-canceled-bd); }
  .wt-pill[data-st="canceled"] .dot { background: var(--st-canceled); }

  @keyframes wtPulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--st-running); opacity: 1; }
    50% { box-shadow: 0 0 0 4px transparent; opacity: 0.55; }
  }

  /* kbd pill */
  .wt-kbd {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 5px;
    background: var(--card-soft);
    border: 1px solid var(--border);
    border-bottom-width: 2px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 11px; line-height: 1;
    color: var(--fg-soft);
  }

  /* table baseline */
  .wt-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
  .wt-table th {
    text-align: left; font-weight: 500; font-size: 11px; letter-spacing: 0.04em;
    color: var(--muted); text-transform: uppercase;
    padding: 8px 12px; border-bottom: 1px solid var(--border);
    background: var(--bg-elev);
  }
  .wt-table td {
    padding: 10px 12px; border-bottom: 1px solid var(--border);
    color: var(--fg-soft);
    height: 38px;
  }
  .wt-table tr:hover td { background: var(--hover); }

  /* link */
  .wt-link { color: var(--fg); text-decoration: none; }
  .wt-link:hover { color: var(--accent); }

  /* tab */
  .wt-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); padding: 0 16px; }
  .wt-tab {
    height: 36px; padding: 0 12px; display: flex; align-items: center; gap: 7px;
    color: var(--muted); font-size: 13px; cursor: pointer;
    border-bottom: 1px solid transparent; margin-bottom: -1px;
  }
  .wt-tab[data-active="true"] { color: var(--fg); border-bottom-color: var(--fg); }

  /* button */
  .wt-btn {
    height: 28px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px;
    background: var(--card); border: 1px solid var(--border); color: var(--fg-soft);
    border-radius: var(--r-2); font-size: 12px; cursor: pointer;
    font-family: var(--font-sans);
  }
  .wt-btn:hover { background: var(--hover); color: var(--fg); border-color: var(--border-strong); }
  .wt-btn[data-variant="primary"] { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  .wt-btn[data-variant="ghost"] { background: transparent; border-color: transparent; }
  .wt-btn[data-variant="danger"] { background: var(--st-failed-bg); color: var(--st-failed); border-color: var(--st-failed-bd); }

  /* card */
  .wt-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-3); }

  /* metric tile */
  .wt-metric { padding: 14px 16px; }
  .wt-metric-label { font-size: 11px; color: var(--muted); letter-spacing: 0.04em; text-transform: uppercase; }
  .wt-metric-value { font-family: var(--font-mono); font-size: 22px; font-weight: 500; color: var(--fg); margin-top: 4px; letter-spacing: -0.01em; }
  .wt-metric-sub { font-size: 11px; color: var(--muted); font-family: var(--font-mono); margin-top: 4px; }

  /* avatar circle */
  .wt-avatar {
    width: 18px; height: 18px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 600; color: var(--fg);
    background: var(--card-soft); border: 1px solid var(--border);
  }

  /* shimmering "live" stripe (used in confident gantt mode) */
  @keyframes wtStripe {
    0% { background-position: 0 0; }
    100% { background-position: 14px 0; }
  }
  .wt-running-stripe {
    background-image: repeating-linear-gradient(
      -45deg,
      transparent 0 4px,
      rgba(255,255,255,0.07) 4px 7px
    );
    background-size: 14px 14px;
    animation: wtStripe 1.4s linear infinite;
  }

  /* event rail dot */
  .wt-eventdot {
    width: 8px; height: 8px; border-radius: 50%;
    border: 2px solid var(--card);
    box-shadow: 0 0 0 1px var(--border);
  }

  /* placeholder image */
  .wt-ph {
    background:
      repeating-linear-gradient(135deg, var(--card-soft) 0 6px, transparent 6px 12px),
      var(--card);
    border: 1px dashed var(--border-strong);
    border-radius: var(--r-2);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
    display: flex; align-items: center; justify-content: center;
  }
`;

// inject once
(function () {
  if (typeof document === "undefined") return;
  if (document.getElementById("wt-tokens")) return;
  const s = document.createElement("style");
  s.id = "wt-tokens";
  s.textContent = WTTokenStyles;
  document.head.appendChild(s);
})();

/* ----------------- shared primitives ----------------- */

function WTFrame({ theme = "dark", children, density = "comfortable", style = {}, className = "", noScroll = false }) {
  return (
    <div
      className={`wt ${className}`}
      data-theme={theme}
      data-density={density}
      style={{
        width: "100%",
        height: "100%",
        overflow: noScroll ? "hidden" : "auto",
        background: "var(--bg)",
        color: "var(--fg)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatusPill({ status, label, dot = true, children }) {
  const text = label ?? status;
  return (
    <span className="wt-pill" data-st={status}>
      {dot && <span className="dot" />}
      {children ?? text}
    </span>
  );
}

function Kbd({ children }) { return <span className="wt-kbd">{children}</span>; }

function Mono({ children, style }) { return <span className="wt-mono" style={style}>{children}</span>; }

function Num({ children, style }) { return <span className="wt-num" style={style}>{children}</span>; }

function Logo({ size = 13, withDot = true }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: size, color: "var(--fg)", letterSpacing: "-0.01em" }}>
      {withDot && (
        <svg width={size + 1} height={size + 1} viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
          <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.95" />
          <rect x="6.5" y="6.5" width="3" height="3" rx="0.5" fill="var(--bg)" />
        </svg>
      )}
      <span>watchtower</span>
    </span>
  );
}

/* tiny inline icons (lucide-ish, hand-rolled minimal) */
const I = {
  search: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  plus: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  filter: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>,
  chev: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 6 6 6-6 6"/></svg>,
  chevD: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  back: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 6-6 6 6 6"/></svg>,
  copy: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"/></svg>,
  ext: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v6H4V5h6"/></svg>,
  github: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.16c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.07.78 2.16v3.2c0 .31.21.66.79.55 4.57-1.52 7.86-5.83 7.86-10.9C23.5 5.66 18.34.5 12 .5Z"/></svg>,
  branch: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10"/><path d="M18 11c0 4-6 4-6 8"/></svg>,
  clock: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  more: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>,
  sun: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  moon: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>,
  laptop: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M2 20h20"/></svg>,
  tool: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 7l3-3 3 3-3 3"/><path d="m17 7-9 9-3 5 5-3 9-9"/></svg>,
  cmd: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6v12a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3V6a3 3 0 1 1 3 3H6a3 3 0 1 1 3-3z"/></svg>,
  doc: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>,
  bash: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 8 4 4-4 4"/><path d="M12 17h6"/></svg>,
  edit: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
  alert: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/></svg>,
  check: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12 5 5L20 7"/></svg>,
  x: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  cancel: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>,
  spark: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17 9 11l4 4 8-8"/></svg>,
  sliders: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6h10M18 6h2"/><path d="M4 18h2M10 18h10"/><path d="M4 12h6M14 12h6"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="18" r="2"/><circle cx="12" cy="12" r="2"/></svg>,
  cog: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.4 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L4.2 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.6 7l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  inbox: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 13 7 5h10l2 8"/><path d="M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/></svg>,
  diff: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v18"/><path d="M5 8h4M5 16h4M15 8h4M15 16h4"/></svg>,
  layers: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/></svg>,
  cloud: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 19a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A4.5 4.5 0 0 0 6.5 19h10.5z"/></svg>,
  user: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
};

Object.assign(window, { WTFrame, StatusPill, Kbd, Mono, Num, Logo, I });
