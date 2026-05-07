// Mobile (Hybrid) — phone-sized job + run detail. Both fit in a 390-wide
// frame and sit on dark backgrounds; light variant is supported but the
// brief calls for dark-first.

function MobileFrame({ theme = "dark", children, label }) {
  return (
    <WTFrame theme={theme} noScroll>
      <div style={{ height: "100%", padding: 16, display: "flex", flexDirection: "column", gap: 8, background: "var(--bg)" }}>
        {/* status bar */}
        <div style={{ height: 28, display: "flex", alignItems: "center", padding: "0 6px" }}>
          <Mono style={{ fontSize: 12, color: "var(--fg-soft)" }}>9:41</Mono>
          <span style={{ flex: 1 }} />
          <span style={{ display: "inline-flex", gap: 4, color: "var(--fg-soft)" }}>
            <span style={{ width: 14, height: 9, borderRadius: 1, background: "currentColor", opacity: 0.7 }} />
            <span style={{ width: 14, height: 9, borderRadius: 1, background: "currentColor", opacity: 0.7 }} />
            <span style={{ width: 22, height: 10, borderRadius: 2, border: "1px solid currentColor" }} />
          </span>
        </div>
        {children}
      </div>
    </WTFrame>
  );
}

function ScreenMobileJob({ theme = "dark" }) {
  const j = jobs[0];
  return (
    <MobileFrame theme={theme}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px" }}>
        <I.back />
        <Mono style={{ fontSize: 11, color: "var(--muted)" }}>shopaurus/checkout</Mono>
        <span style={{ flex: 1 }} />
        <I.search />
        <I.more />
      </div>

      {/* job title */}
      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusPill status="running" />
          <Mono style={{ fontSize: 11, color: "var(--muted)" }}>j_4f1c · 04:18</Mono>
        </div>
        <h1 style={{ margin: "8px 0 0", fontSize: 19, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
          {j.message}
        </h1>
      </div>

      {/* compact gantt */}
      <div className="wt-card" style={{ marginTop: 10, padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Timeline</Mono>
          <span style={{ flex: 1 }} />
          <Mono style={{ fontSize: 10, color: "var(--st-running)" }}>now</Mono>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { name: "planner", status: "succeeded", l: 0, w: 7 },
            { name: "task 1 · impl", status: "succeeded", l: 8, w: 34 },
            { name: "task 1 · review", status: "succeeded", l: 43, w: 15 },
            { name: "task 2 · impl", status: "running", l: 10, w: 90 },
            { name: "task 3 · impl", status: "running", l: 18, w: 82 },
            { name: "task 3 · review", status: "succeeded", l: 62, w: 16 },
            { name: "task 4 · impl", status: "failed", l: 10, w: 45 },
            { name: "merger", status: "running", l: 92, w: 8 },
          ].map((b, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 6, alignItems: "center" }}>
              <Mono style={{ fontSize: 10, color: "var(--fg-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</Mono>
              <div style={{ position: "relative", height: 12, background: "var(--card-soft)", borderRadius: 2 }}>
                <div style={{ position: "absolute", left: `${b.l}%`, width: `${b.w}%`, top: 0, bottom: 0, background: `var(--st-${b.status})`, opacity: 0.5, borderRadius: 2 }} />
                {b.status === "running" && <div className="wt-running-stripe" style={{ position: "absolute", left: `${b.l}%`, width: `${b.w}%`, top: 0, bottom: 0, borderRadius: 2 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* tasks list */}
      <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 14 }}>4 tasks</Mono>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, flex: 1, overflow: "auto", paddingBottom: 4 }}>
        {tasks.map((t, i) => (
          <div key={t.id} className="wt-card" style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Mono style={{ fontSize: 10, color: "var(--muted)" }}>#{String(i + 1).padStart(2, "0")}</Mono>
              <StatusPill status={t.status} />
              <span style={{ flex: 1 }} />
              <Mono style={{ fontSize: 10, color: "var(--muted)" }}>{t.runs} runs</Mono>
            </div>
            <div style={{ fontSize: 13, marginTop: 6, color: "var(--fg)", lineHeight: 1.35 }}>{t.title}</div>
            <Mono style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{t.branch}</Mono>
          </div>
        ))}
      </div>

      {/* bottom action */}
      <div style={{ height: 44, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--st-failed-bg)", color: "var(--st-failed)", border: "1px solid var(--st-failed-bd)", fontSize: 13, fontWeight: 500, gap: 6 }}>
        <I.cancel /> Cancel job
      </div>
    </MobileFrame>
  );
}

function ScreenMobileRun({ theme = "dark" }) {
  return (
    <MobileFrame theme={theme}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px" }}>
        <I.back />
        <Mono style={{ fontSize: 11, color: "var(--muted)" }}>j_4f1c</Mono>
        <span style={{ flex: 1 }} />
        <I.more />
      </div>

      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusPill status="running" />
          <Mono style={{ fontSize: 11, color: "var(--muted)" }}>r_4f1c · iter 5/12 · 03:42</Mono>
        </div>
        <h1 style={{ margin: "8px 0 0", fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>
          <Mono style={{ fontSize: 12, color: "var(--muted)", marginRight: 6 }}>implementer</Mono>
          Round tax to nearest cent before promo deduction
        </h1>
        <div style={{ display: "flex", gap: 10, marginTop: 6, color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)", flexWrap: "wrap" }}>
          <span>claude-sonnet-4.5</span><span>·</span><span>docker</span><span>·</span><span>fix/tax-round-order</span>
        </div>
      </div>

      {/* iteration progress */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>iterations</Mono>
          <Mono style={{ fontSize: 10, color: "var(--muted)" }}>5 of 12 · 7 left</Mono>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{
              flex: 1, height: 6, borderRadius: 2,
              background: i < 4 ? "var(--st-succeeded)" : i === 4 ? "var(--st-running)" : "var(--card-soft)",
              opacity: i < 4 ? 0.7 : 1,
            }} />
          ))}
        </div>
      </div>

      {/* token strip */}
      <div className="wt-card" style={{ marginTop: 10, padding: "10px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            ["Tokens", "108k", "↑ since iter 3"],
            ["Cost", "$0.184", "running"],
            ["Tools", "13", "edit · bash · read"],
          ].map(([l, v, s], i) => (
            <div key={i}>
              <Mono style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</Mono>
              <div style={{ fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 500, marginTop: 2 }}>{v}</div>
              <Mono style={{ fontSize: 10, color: "var(--muted)" }}>{s}</Mono>
            </div>
          ))}
        </div>
      </div>

      {/* events scroll */}
      <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 14 }}>Latest events</Mono>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, flex: 1, overflow: "auto", paddingBottom: 4 }}>
        {[
          { t: "1:26", icon: <I.bash />, name: "bash", arg: "pnpm test", out: "running…", running: true },
          { t: "1:08", icon: <I.bash />, name: "bash", arg: "pnpm typecheck", out: "0 errors", st: "succeeded" },
          { t: "1:01", icon: <I.edit />, name: "edit", arg: "src/pricing/cart-total.ts", out: "+3 −0" },
          { t: "0:55", icon: null, name: null, body: "Reservation payload uses pre-rounded subtotal. Safe. Adding a comment to anchor the invariant." },
          { t: "0:46", icon: <I.doc />, name: "read", arg: "src/pricing/reserve-payload.ts", out: "88 lines" },
          { t: "0:34", icon: <I.bash />, name: "bash", arg: "pnpm test pricing", out: "12 passed (1.4s)", st: "succeeded" },
        ].map((e, i) => (
          <div key={i} className="wt-card" style={{ padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Mono style={{ fontSize: 10, color: "var(--muted)", width: 30 }}>{e.t}</Mono>
              {e.icon ? (
                <span style={{ width: 18, height: 18, borderRadius: 4, background: "var(--card-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{e.icon}</span>
              ) : (
                <span style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>·</span>
              )}
              {e.name && <Mono style={{ fontSize: 11, color: "var(--fg)" }}>{e.name}</Mono>}
              {e.arg && <Mono style={{ fontSize: 10, color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.arg}</Mono>}
              {!e.name && <span style={{ flex: 1 }} />}
              {e.out && (
                <Mono style={{ fontSize: 10, color: e.running ? "var(--st-running)" : e.st === "succeeded" ? "var(--st-succeeded)" : "var(--muted)" }}>
                  {e.out}
                </Mono>
              )}
            </div>
            {e.body && <div style={{ fontSize: 12, color: "var(--fg-soft)", marginTop: 6, lineHeight: 1.4, paddingLeft: 38 }}>{e.body}</div>}
          </div>
        ))}
      </div>
    </MobileFrame>
  );
}

Object.assign(window, { ScreenMobileJob, ScreenMobileRun });
