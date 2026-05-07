// Run detail (/runs/:id) — the second hero surface.
//
// Data model the UI now reflects:
//   A Run has ≥1 Iterations. Each Iteration has N Turns until it
//   completes (succeeded / failed / canceled). Turns are unbounded —
//   we never show a "X / max" turn counter, only "turn N".
//   Most runs are one-shots: 1 iteration, N turns. The iteration
//   switcher only surfaces when iterations > 1; otherwise it collapses
//   to a single static label.

function ScreenRunDetail({ theme = "dark", iterContext }) {
  const r = runFocus;
  const ctx = iterContext ?? { count: 1, current: 1, prev: [] };
  return (
    <AppShell theme={theme} crumbs={["Projects", "shopaurus/checkout", "Job j_4f1c9a", `Run · ${r.name}`]}>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 360px", minHeight: 0 }}>
        {/* main column */}
        <div style={{ overflow: "auto", padding: "20px 28px 32px" }}>
          <RunHeader run={r} ctx={ctx} />

          {/* iteration switcher — only renders chrome when >1 iteration */}
          <IterationSwitcher ctx={ctx} />

          {/* event timeline */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 24, marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Event timeline</h2>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{r.events.length} events · grouped by turn</Mono>
              <button className="wt-btn"><I.filter /> All</button>
              <button className="wt-btn">Auto-scroll <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--st-running)", marginLeft: 4 }} /></button>
            </div>
          </div>
          <EventTimelineRail events={r.events} iters={r.iters} />
        </div>

        {/* right rail */}
        <RunRightRail run={r} ctx={ctx} theme={theme} />
      </div>
    </AppShell>
  );
}

/* -------- header (mirrors JobHeader rhythm) -------- */

function RunHeader({ run, ctx }) {
  return (
    <>
      {/* row 1 — kicker (mirrors job's "JOB · j_xxxx [pill] …") */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Mono style={{ fontSize: 11, color: "var(--muted)" }}>RUN · r_4f1c9a</Mono>
        <StatusPill status="running" />
        <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{run.name}</Mono>
        <span style={{ width: 1, height: 10, background: "var(--border-strong)" }} />
        {ctx.count > 1 ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>iteration</Mono>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 0, height: 18, border: "1px solid var(--border)", borderRadius: 4, background: "var(--card-soft)" }}>
              <button className="wt-btn" data-variant="ghost" style={{ height: 16, width: 16, padding: 0, borderRadius: 0, color: "var(--muted)" }}><I.back /></button>
              <Mono style={{ fontSize: 11, padding: "0 6px", color: "var(--fg)" }}>{ctx.current} / {ctx.count}</Mono>
              <button className="wt-btn" data-variant="ghost" style={{ height: 16, width: 16, padding: 0, borderRadius: 0, color: "var(--muted)" }}><I.chev /></button>
            </span>
          </span>
        ) : (
          <Mono style={{ fontSize: 11, color: "var(--muted)" }}>iteration 1</Mono>
        )}
        <Mono style={{ fontSize: 11, color: "var(--muted)" }}>· turn 5</Mono>
      </div>
      {/* row 2 — task as h1 (matches job's fontSize: 20) */}
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.01em", lineHeight: 1.3, textWrap: "pretty" }}>
        {run.task}
      </h1>
      {/* row 3 — meta + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: 12, flex: 1, flexWrap: "wrap", rowGap: 6 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><I.clock />Started 14:03:09 · <span style={{ color: "var(--st-running)" }}>running 03:42</span></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><I.branch /><Mono>{run.branch}</Mono></span>
          <span>·</span>
          <Mono>claude-sonnet-4.5</Mono>
          <span>·</span>
          <Mono>docker</Mono>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="wt-btn"><I.copy /> Copy logs</button>
          <button className="wt-btn"><I.diff /> Compare to last</button>
          <button className="wt-btn" data-variant="danger"><I.cancel /> Cancel run</button>
        </div>
      </div>
    </>
  );
}

/* -------- iteration switcher (only visible when iterations > 1) -------- */

function IterationSwitcher({ ctx }) {
  if (ctx.count <= 1) return null;
  return (
    <div style={{ marginTop: 18, display: "flex", alignItems: "stretch", gap: 0, border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", background: "var(--bg-elev)" }}>
      {ctx.prev.map((it, i) => {
        const active = it.n === ctx.current;
        return (
          <button key={it.n} style={{
            flex: 1,
            display: "flex", flexDirection: "column", gap: 4,
            padding: "10px 12px", textAlign: "left",
            background: active ? "var(--card)" : "transparent",
            border: "none",
            borderRight: i < ctx.prev.length - 1 ? "1px solid var(--border)" : "none",
            borderTop: active ? "2px solid var(--accent)" : "2px solid transparent",
            cursor: "pointer",
            color: "var(--fg-soft)",
            fontFamily: "var(--font-sans)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Mono style={{ fontSize: 11, color: active ? "var(--fg)" : "var(--muted)" }}>iteration {it.n}</Mono>
              <StatusPill status={it.status} />
            </div>
            <Mono style={{ fontSize: 11, color: "var(--muted-2)" }}>{it.turns} turns · {it.dur}{it.note ? ` · ${it.note}` : ""}</Mono>
          </button>
        );
      })}
    </div>
  );
}

/* -------- token table (per-turn within current iteration) -------- */

function TokensPerTurnTable({ iters }) {
  const sum = (k) => iters.reduce((a, b) => a + b[k], 0);
  return (
    <div className="wt-card" style={{ overflow: "hidden" }}>
      <table className="wt-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>Turn</th>
            <th style={{ textAlign: "right" }}>Input</th>
            <th style={{ textAlign: "right" }}>Output</th>
            <th style={{ textAlign: "right" }}>Cache read</th>
            <th style={{ textAlign: "right" }}>Cache create</th>
            <th style={{ width: 70, textAlign: "right" }}>Dur</th>
            <th style={{ width: 90, textAlign: "right" }}>Sub-cost</th>
          </tr>
        </thead>
        <tbody>
          {iters.map(it => (
            <tr key={it.n}>
              <td>
                <Mono>#{String(it.n).padStart(2, "0")}</Mono>
                {it.running && <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--st-running)", display: "inline-block", marginLeft: 6, animation: "wtPulse 1.6s ease-in-out infinite" }} />}
              </td>
              <td style={{ textAlign: "right" }}><Num>{it.in.toLocaleString()}</Num></td>
              <td style={{ textAlign: "right" }}><Num>{it.out.toLocaleString()}</Num></td>
              <td style={{ textAlign: "right" }}><Num style={{ color: "var(--muted)" }}>{it.cr.toLocaleString()}</Num></td>
              <td style={{ textAlign: "right" }}><Num style={{ color: "var(--muted)" }}>{it.cc.toLocaleString()}</Num></td>
              <td style={{ textAlign: "right" }}><Mono style={{ fontSize: 12 }}>{it.dur}</Mono></td>
              <td style={{ textAlign: "right" }}><Num>${(it.in * 0.000003 + it.out * 0.000015).toFixed(3)}</Num></td>
            </tr>
          ))}
          <tr style={{ background: "var(--bg-elev)" }}>
            <td><Mono style={{ fontWeight: 600 }}>Total</Mono></td>
            <td style={{ textAlign: "right" }}><Num style={{ color: "var(--fg)" }}>{sum("in").toLocaleString()}</Num></td>
            <td style={{ textAlign: "right" }}><Num style={{ color: "var(--fg)" }}>{sum("out").toLocaleString()}</Num></td>
            <td style={{ textAlign: "right" }}><Num>{sum("cr").toLocaleString()}</Num></td>
            <td style={{ textAlign: "right" }}><Num>{sum("cc").toLocaleString()}</Num></td>
            <td style={{ textAlign: "right" }}><Mono>03:42</Mono></td>
            <td style={{ textAlign: "right" }}><Num style={{ color: "var(--fg)" }}>$0.184</Num></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* -------- event timeline (turn rail · the chosen direction) -------- */

function EventTimelineRail({ events, iters = [] }) {
  const byTurn = {};
  events.forEach(e => { (byTurn[e.iter] ??= []).push(e); });
  const turns = Object.keys(byTurn).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 18, top: 4, bottom: 0, width: 1, background: "var(--border)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {turns.map(n => {
          const evs = byTurn[n];
          const running = evs.some(e => e.running);
          const turnMeta = iters.find(it => it.n === n);
          return (
            <div key={n}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "var(--card-soft)", border: "1px solid var(--border)", borderRadius: 4,
                  fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg)",
                  position: "relative", zIndex: 1,
                }}>#{String(n).padStart(2, "0")}</div>
                <Mono style={{ fontSize: 11, color: "var(--fg-soft)" }}>turn {n}</Mono>
                {turnMeta && <Mono style={{ fontSize: 11, color: "var(--muted)" }}>· {(turnMeta.in + turnMeta.out).toLocaleString()} tok · {turnMeta.dur}</Mono>}
                {running && <Mono style={{ fontSize: 11, color: "var(--st-running)" }}>· running</Mono>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 36 }}>
                {evs.map((e, i) => <EventCard key={i} ev={e} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ ev }) {
  if (ev.kind === "text") {
    return (
      <div style={{
        position: "relative",
        background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6,
        padding: "9px 12px", display: "flex", gap: 10,
      }}>
        <span style={{ width: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 2 }}>
          <Mono style={{ fontSize: 10, color: "var(--muted)" }}>{ev.t}</Mono>
        </span>
        <div style={{ flex: 1, fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.55, textWrap: "pretty" }}>
          {ev.body}
        </div>
      </div>
    );
  }
  const icon = ev.name === "edit" ? <I.edit /> : ev.name === "bash" ? <I.bash /> : ev.name === "read" ? <I.doc /> : <I.tool />;
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6,
      padding: "8px 12px", display: "flex", gap: 10, alignItems: "center",
    }}>
      <Mono style={{ fontSize: 10, color: "var(--muted)", width: 26 }}>{ev.t}</Mono>
      <span style={{ width: 22, height: 22, borderRadius: 5, background: "var(--card-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--fg-soft)" }}>{icon}</span>
      <Mono style={{ fontSize: 12, color: "var(--fg)", minWidth: 50 }}>{ev.name}</Mono>
      <Mono style={{ fontSize: 12, color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.args}</Mono>
      {ev.changes && <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{ev.changes}</Mono>}
      {ev.matches != null && <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{ev.matches} matches</Mono>}
      {ev.lines != null && <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{ev.lines} lines</Mono>}
      {ev.out && (
        <Mono style={{ fontSize: 11, color: ev.running ? "var(--st-running)" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          {ev.running && <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--st-running)", animation: "wtPulse 1.6s ease-in-out infinite" }} />}
          {ev.out}
        </Mono>
      )}
      <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{ev.dur}</Mono>
      <I.chev />
    </div>
  );
}

/* -------- right rail -------- */

function RunRightRail({ run, ctx, theme }) {
  return (
    <div style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-elev)", padding: "20px 20px", overflow: "auto" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Run metadata</div>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", rowGap: 8, fontSize: 12 }}>
        {[
          ["ID", <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Mono>r_4f1c9a</Mono><button className="wt-btn" data-variant="ghost" style={{ height: 18, width: 18, padding: 0, color: "var(--muted)" }}><I.copy /></button></span>],
          ["Name", <Mono>{run.name}</Mono>],
          ["Job", <a className="wt-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mono>j_4f1c9a</Mono><I.ext /></a>],
          ["Task", <span>Round tax to nearest cent…</span>],
          ["Status", <StatusPill status="running" />],
          ["Agent", <Mono>{run.agent}</Mono>],
          ["Model", <Mono>{run.model}</Mono>],
          ["Sandbox", <Mono>{run.sandbox}</Mono>],
          ["Branch", <Mono>{run.branch}</Mono>],
          ["Started", <Mono>14:03:09</Mono>],
          ["Elapsed", <Mono style={{ color: "var(--st-running)" }}>03:42</Mono>],
          ["Iterations", <Mono>{ctx.current} / {ctx.count}</Mono>],
        ].map(([k, v], i) => (
          <React.Fragment key={i}>
            <Mono style={{ color: "var(--muted)" }}>{k}</Mono>
            <span style={{ color: "var(--fg-soft)" }}>{v}</span>
          </React.Fragment>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

      {/* Turns are unbounded — show a counter, not a progress bar. */}
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>This iteration</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <Mono style={{ fontSize: 22, color: "var(--fg)", letterSpacing: "-0.01em" }}>turn 5</Mono>
        <Mono style={{ fontSize: 11, color: "var(--st-running)" }}>· running 03:42</Mono>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        {[
          ["tokens", "51,200 / 13,900"],
          ["events", "31"],
          ["tools", "13"],
          ["cost", "$0.184"],
        ].map(([k, v], i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 5 }}>
            <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</Mono>
            <Mono style={{ fontSize: 12, color: "var(--fg)" }}>{v}</Mono>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Tools used</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          ["edit", 4, 0.62],
          ["bash", 3, 0.42],
          ["read", 5, 0.78],
          ["grep", 1, 0.16],
        ].map(([n, c, w], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 30px", alignItems: "center", gap: 8 }}>
            <Mono style={{ fontSize: 11, color: "var(--fg)" }}>{n}</Mono>
            <div style={{ height: 6, background: "var(--card-soft)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${w * 100}%`, height: "100%", background: "var(--accent)", opacity: 0.6 }} />
            </div>
            <Num style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>{c}</Num>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- multi-iteration variant (demonstrates the switcher) -------- */

const MULTI_ITER_CTX = {
  count: 3,
  current: 3,
  prev: [
    { n: 1, status: "failed",    turns: 7, dur: "02:14", note: "tests still failing" },
    { n: 2, status: "failed",    turns: 5, dur: "01:38", note: "regression in promo path" },
    { n: 3, status: "running",   turns: 5, dur: "03:42", note: "in progress" },
  ],
};

function ScreenRunDetailMultiIter({ theme = "dark" }) {
  return <ScreenRunDetail theme={theme} iterContext={MULTI_ITER_CTX} />;
}

Object.assign(window, {
  ScreenRunDetail, ScreenRunDetailMultiIter,
  EventTimelineRail,
});
