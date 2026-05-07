// Foundations — type, color, status, patterns. One artboard per concept;
// they sit in the first section of the canvas so the user can scan the
// system before drilling into screens.

function FoundationCard({ title, hint, children, theme = "dark", style = {} }) {
  return (
    <WTFrame theme={theme} noScroll>
      <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 14, ...style }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>{title}</div>
          {hint && <div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 4 }}>{hint}</div>}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </WTFrame>
  );
}

function FoundationType({ theme = "dark" }) {
  const Row = ({ size, weight = 500, family = "var(--font-sans)", lh = 1.2, label, sample }) => (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "baseline", gap: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
      <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{label}</Mono>
      <div style={{ fontSize: size, fontWeight: weight, fontFamily: family, lineHeight: lh, color: "var(--fg)", letterSpacing: size >= 24 ? "-0.015em" : 0 }}>{sample}</div>
    </div>
  );
  return (
    <FoundationCard theme={theme} title="Type · Geist Sans + Geist Mono" hint="UI in Geist Sans. Identifiers, timestamps, token counts, kbd in Geist Mono.">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Row label="display / 28" size={28} weight={600} sample="Job: idempotent cart total" />
        <Row label="h1 / 22" size={22} weight={600} sample="Run · implementer" />
        <Row label="h2 / 18" size={18} weight={600} sample="Token usage" />
        <Row label="body / 14" size={14} weight={400} lh={1.5} sample="Reading the failing snapshot. The promo deduction runs before tax rounding." />
        <Row label="ui / 13" size={13} weight={400} sample="14:02:31 · main · running 4m 18s" />
        <Row label="meta / 12" size={12} weight={400} sample="9 runs · 412k tokens · 5/12 iterations" />
        <Row label="caps / 11" size={11} weight={500} sample="STATUS · DURATION · TOKENS" />
        <Row label="mono / 13" size={13} family="var(--font-mono)" weight={400} sample="r_4f1c · 41,200 · 14:02:31.482Z" />
      </div>
    </FoundationCard>
  );
}

function FoundationColor({ theme = "dark" }) {
  const tokens = [
    ["bg", "background"],
    ["bg-elev", "elevated"],
    ["card", "card"],
    ["card-soft", "card·soft"],
    ["hover", "hover"],
    ["border", "border"],
    ["border-strong", "border·strong"],
    ["fg", "foreground"],
    ["fg-soft", "fg·soft"],
    ["muted", "muted"],
    ["accent", "accent"],
  ];
  return (
    <FoundationCard theme={theme} title="Semantic tokens · OKLCH" hint="Both themes share the same token names; raw colors never appear in screens.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {tokens.map(([k, label]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `var(--${k})`, border: "1px solid var(--border)" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Mono style={{ fontSize: 12, color: "var(--fg)" }}>{label}</Mono>
              <Mono style={{ fontSize: 10, color: "var(--muted)" }}>--{k}</Mono>
            </div>
          </div>
        ))}
      </div>
    </FoundationCard>
  );
}

function FoundationStatus({ theme = "dark" }) {
  const sts = [
    { v: "running",   note: "sky · live, pulsing dot" },
    { v: "succeeded", note: "emerald · static" },
    { v: "failed",    note: "rose · static" },
    { v: "canceled",  note: "amber · de-emphasized" },
  ];
  return (
    <FoundationCard theme={theme} title="Status palette" hint="The single dimension allowed to use color. Pulse only on running.">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sts.map(s => (
          <div key={s.v} style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", alignItems: "center", gap: 14 }}>
            <StatusPill status={s.v} />
            <div style={{ height: 22, borderRadius: 4, background: `var(--st-${s.v}-bg)`, border: `1px solid var(--st-${s.v}-bd)`, position: "relative", overflow: "hidden" }}>
              {s.v === "running" && <div className="wt-running-stripe" style={{ position: "absolute", inset: 0 }} />}
            </div>
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{s.note}</Mono>
          </div>
        ))}
        <div style={{ marginTop: 8, padding: 10, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card-soft)" }}>
          <Mono style={{ fontSize: 11, color: "var(--muted)" }}>swatch on bar · light + dark</Mono>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {["running", "succeeded", "failed", "canceled"].map(v => (
              <div key={v} style={{ flex: 1, height: 8, borderRadius: 2, background: `var(--st-${v})` }} />
            ))}
          </div>
        </div>
      </div>
    </FoundationCard>
  );
}

function FoundationPatterns({ theme = "dark" }) {
  return (
    <FoundationCard theme={theme} title="Pattern library" hint="The eight repeating units the screens compose from.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* status pill */}
        <PatternBox label="Status pill">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <StatusPill status="running" />
            <StatusPill status="succeeded" />
            <StatusPill status="failed" />
            <StatusPill status="canceled" />
          </div>
        </PatternBox>

        {/* kbd pill */}
        <PatternBox label="Kbd · ⌘K">
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Kbd>⌘</Kbd><Kbd>K</Kbd>
            <span style={{ color: "var(--muted-2)", padding: "0 6px" }}>·</span>
            <Kbd>G</Kbd><Kbd>J</Kbd>
            <span style={{ color: "var(--muted-2)", padding: "0 6px" }}>·</span>
            <Kbd>esc</Kbd>
          </div>
        </PatternBox>

        {/* table row */}
        <PatternBox label="Table row" wide>
          <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            <table className="wt-table">
              <thead><tr><th>Started</th><th>Status</th><th>Duration</th><th style={{ textAlign: "right" }}>Tokens</th></tr></thead>
              <tbody>
                <tr><td><Mono>14:02:31</Mono></td><td><StatusPill status="running" /></td><td><Mono>04:18</Mono></td><td style={{ textAlign: "right" }}><Num>412k</Num></td></tr>
                <tr><td><Mono>13:18:09</Mono></td><td><StatusPill status="succeeded" /></td><td><Mono>12:41</Mono></td><td style={{ textAlign: "right" }}><Num>1.2M</Num></td></tr>
              </tbody>
            </table>
          </div>
        </PatternBox>

        {/* metric tile */}
        <PatternBox label="Metric tile">
          <div className="wt-card" style={{ display: "flex" }}>
            <div className="wt-metric" style={{ flex: 1 }}>
              <div className="wt-metric-label">Total tokens</div>
              <div className="wt-metric-value">412,341</div>
              <div className="wt-metric-sub">↑ 12.4% vs prior run</div>
            </div>
          </div>
        </PatternBox>

        {/* timeline bar */}
        <PatternBox label="Timeline bar (gantt)">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ position: "relative", height: 14, background: "var(--card-soft)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: "10%", width: "70%", height: "100%", background: "var(--st-running)", opacity: 0.6 }} />
              <div className="wt-running-stripe" style={{ position: "absolute", left: "10%", width: "70%", height: "100%" }} />
            </div>
            <div style={{ position: "relative", height: 14, background: "var(--card-soft)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: "5%", width: "30%", height: "100%", background: "var(--st-succeeded)", opacity: 0.6 }} />
            </div>
          </div>
        </PatternBox>

        {/* event card */}
        <PatternBox label="Event card">
          <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", background: "var(--card)", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: "var(--card-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><I.tool /></span>
              <Mono style={{ fontSize: 12, color: "var(--fg)" }}>edit</Mono>
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>src/pricing/cart-total.ts</Mono>
              <span style={{ flex: 1 }} />
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>+4 −2</Mono>
            </div>
          </div>
        </PatternBox>

        {/* empty state */}
        <PatternBox label="Empty state">
          <div style={{ border: "1px dashed var(--border-strong)", borderRadius: 6, padding: "12px 14px", textAlign: "center" }}>
            <Mono style={{ fontSize: 12, color: "var(--muted)" }}>No Jobs yet</Mono>
            <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 2 }}>Run <Mono>watchtower run main.ts</Mono> to start one.</div>
          </div>
        </PatternBox>

        {/* avatars row */}
        <PatternBox label="Run name chip">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["planner", "implementer", "reviewer", "merger", "worker"].map(n => (
              <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "2px 8px", border: "1px solid var(--border)", borderRadius: 99, background: "var(--card-soft)", color: "var(--fg-soft)", fontFamily: "var(--font-mono)" }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--muted)" }} />{n}
              </span>
            ))}
          </div>
        </PatternBox>
      </div>
    </FoundationCard>
  );
}

function PatternBox({ label, children, wide = false }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto", display: "flex", flexDirection: "column", gap: 8 }}>
      <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</Mono>
      {children}
    </div>
  );
}

Object.assign(window, { FoundationType, FoundationColor, FoundationStatus, FoundationPatterns });
