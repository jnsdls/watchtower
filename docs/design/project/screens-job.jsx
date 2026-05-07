// Job detail with the Gantt + swimlanes — the hero surface.
// Three Gantt directions, switched by the `gantt` tweak:
//   - "refined": stock-but-refined; clean bars, axis, tick density.
//   - "stream":  custom; each bar embeds a per-iteration token sparkline.
//   - "editorial": monospace ticks, alignment grid visible.

function ScreenJobDetail({ theme = "dark", gantt = "stream" }) {
  const p = projects[0];
  const j = jobs[0];

  // Build swimlanes: planner (no task), then per-task rows for impl/review,
  // then merger. We render task lanes as a group with a label.
  const taskLanes = tasks.map(t => ({
    task: t,
    rows: [
      { name: "implementer", run: runs.find(r => r.task === t.id && r.name === "implementer") },
      { name: "reviewer",    run: runs.find(r => r.task === t.id && r.name === "reviewer") },
    ].filter(r => r.run),
  }));

  return (
    <AppShell theme={theme} crumbs={["Projects", p.name, `Job ${j.id}`]}>
      <div style={{ flex: 1, padding: "16px 24px 0", display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
        {/* job header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>JOB · j_4f1c9a</Mono>
              <StatusPill status="running" />
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>plan-impl-review · 4 tasks · 7 runs</Mono>
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.01em" }}>
              {j.message}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><I.clock />Started 14:02:31 · running 04:18</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><I.branch />main</span>
              <span>·</span>
              <Mono>watchtower run main.ts</Mono>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="wt-btn"><I.copy /> Copy ID</button>
            <button className="wt-btn"><I.diff /> Compare</button>
            <button className="wt-btn" data-variant="danger"><I.cancel /> Cancel job</button>
          </div>
        </div>

        {/* gantt */}
        <div className="wt-card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Timeline</span>
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{gantt === "refined" ? "refined" : gantt === "stream" ? "with token-stream sparkline" : "editorial — alignment grid"}</Mono>
            </div>
            <span style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 4, padding: 2, background: "var(--card-soft)", border: "1px solid var(--border)", borderRadius: 5 }}>
              {[
                ["Task lanes", true],
                ["Run name", false],
                ["Flat", false],
              ].map(([l, a], i) => (
                <span key={i} style={{ padding: "3px 8px", fontSize: 11, color: a ? "var(--fg)" : "var(--muted)", background: a ? "var(--hover)" : "transparent", borderRadius: 3, cursor: "pointer" }}>{l}</span>
              ))}
            </div>
            <span style={{ width: 12 }} />
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>now</Mono>
          </div>

          <Gantt theme={theme} variant={gantt} taskLanes={taskLanes} />
        </div>

        {/* tasks + runs side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="wt-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Tasks</span>
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>4 · from planner</Mono>
            </div>
            <table className="wt-table">
              <thead><tr><th>#</th><th>Title</th><th>Branch</th><th style={{ width: 110 }}>Status</th><th style={{ width: 50, textAlign: "right" }}>Runs</th></tr></thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={t.id}>
                    <td><Mono style={{ color: "var(--muted)" }}>{String(i + 1).padStart(2, "0")}</Mono></td>
                    <td>{t.title}</td>
                    <td><Mono style={{ fontSize: 11, color: "var(--muted)" }}>{t.branch}</Mono></td>
                    <td><StatusPill status={t.status} /></td>
                    <td style={{ textAlign: "right" }}><Num>{t.runs}</Num></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="wt-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Runs</span>
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{runs.length}</Mono>
            </div>
            <table className="wt-table">
              <thead><tr><th>Name</th><th>Task</th><th style={{ width: 100 }}>Status</th><th style={{ width: 70 }}>Iters</th><th style={{ width: 70, textAlign: "right" }}>Dur</th></tr></thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--muted)" }} />
                        {r.name}
                      </span>
                    </td>
                    <td><Mono style={{ fontSize: 11, color: "var(--muted)" }}>{r.task ? `t${r.task.slice(1)}` : "—"}</Mono></td>
                    <td><StatusPill status={r.status} /></td>
                    <td><Num>{r.iters}</Num></td>
                    <td style={{ textAlign: "right" }}><Mono>{r.dur}</Mono></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>
    </AppShell>
  );
}

/* ----- the Gantt itself ----- */

function Gantt({ theme, variant, taskLanes }) {
  // Time axis: 0 .. 1 mapped to a label set
  const ticks = ["+0s", "+30s", "+1m", "+1m30", "+2m", "+2m30", "+3m", "+3m30", "+4m", "now"];
  const lanePad = variant === "editorial" ? 0 : 0;

  // helper: construct lanes top to bottom
  const planner = runs.find(r => r.name === "planner");
  const merger  = runs.find(r => r.name === "merger");

  const allLanes = [];
  allLanes.push({ kind: "header", label: "Planner" });
  allLanes.push({ kind: "run", indent: 0, run: planner });
  taskLanes.forEach((tl, i) => {
    allLanes.push({ kind: "header", label: tl.task.title, branch: tl.task.branch, status: tl.task.status });
    tl.rows.forEach(r => allLanes.push({ kind: "run", indent: 1, run: r.run, runName: r.name }));
  });
  allLanes.push({ kind: "header", label: "Merger" });
  allLanes.push({ kind: "run", indent: 0, run: merger });

  return (
    <div style={{ position: "relative", padding: variant === "editorial" ? "0" : "0 0 0 0" }}>
      {/* axis */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)" }}>
        <div style={{ padding: "6px 14px", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Lane</div>
        <div style={{ position: "relative", height: 24 }}>
          {ticks.map((t, i) => (
            <div key={i} style={{ position: "absolute", left: `${(i / (ticks.length - 1)) * 100}%`, transform: "translateX(-50%)", top: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: i === ticks.length - 1 ? "var(--st-running)" : "var(--muted)" }}>{t}</div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        {allLanes.map((L, i) => {
          if (L.kind === "header") {
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 1fr", borderBottom: "1px solid var(--border)", background: variant === "editorial" ? "transparent" : "var(--bg-elev)" }}>
                <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Mono style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {L.label.length > 26 ? L.label.slice(0, 24) + "…" : L.label}
                  </Mono>
                </div>
                <div style={{ height: 26, position: "relative" }}>
                  {variant === "editorial" && <GridLines theme={theme} />}
                  {L.branch && <Mono style={{ position: "absolute", right: 14, top: 6, fontSize: 10, color: "var(--muted)" }}>{L.branch}</Mono>}
                </div>
              </div>
            );
          }
          const r = L.run;
          if (!r) return null;
          return (
            <GanttRow key={i} variant={variant} indent={L.indent} run={r} runName={L.runName} />
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", borderTop: "1px solid var(--border)" }}>
        <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--muted)" }}>Legend</div>
        <div style={{ padding: "8px 14px", display: "flex", gap: 14, alignItems: "center", fontSize: 11, color: "var(--muted)" }}>
          {["running", "succeeded", "failed", "canceled"].map(s => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 8, borderRadius: 2, background: `var(--st-${s})`, opacity: 0.7 }} />{s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridLines({ theme }) {
  return (
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, transparent 0 calc(11.111% - 1px), var(--border) calc(11.111% - 1px) 11.111%)" }} />
  );
}

function GanttRow({ variant, indent, run, runName }) {
  const left  = run.t[0] * 100;
  const right = run.t[1] * 100;
  const width = right - left;
  const running = run.status === "running";

  // sparkline points for "stream" variant — synthesize a tiny per-iter shape
  const sparkline = (() => {
    const seed = run.id.charCodeAt(2) || 5;
    const n = Math.max(4, run.iters || 4);
    const arr = [];
    for (let i = 0; i < n; i++) {
      const v = ((Math.sin((i + seed) * 1.9) + 1) / 2) * 0.7 + 0.15;
      arr.push(v);
    }
    return arr;
  })();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", borderBottom: "1px solid var(--border)", height: 30 }}>
      <div style={{ padding: indent ? "0 14px 0 28px" : "0 14px", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ width: 5, height: 5, borderRadius: 99, background: `var(--st-${run.status})`, flexShrink: 0 }} />
        <Mono style={{ fontSize: 12, color: "var(--fg)" }}>{runName ?? run.name}</Mono>
      </div>
      <div style={{ position: "relative" }}>
        {variant === "editorial" && <GridLines />}
        {/* the bar */}
        <div style={{
          position: "absolute",
          left: `${left}%`,
          width: `${width}%`,
          top: 6,
          bottom: 6,
          borderRadius: variant === "editorial" ? 0 : 4,
          background: `var(--st-${run.status}-bg)`,
          border: `1px solid var(--st-${run.status}-bd)`,
          overflow: "hidden",
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 7px",
        }}>
          {/* fill */}
          <div style={{ position: "absolute", inset: 0, background: `var(--st-${run.status})`, opacity: 0.3 }} />
          {/* running stripe */}
          {running && <div className="wt-running-stripe" style={{ position: "absolute", inset: 0 }} />}
          {/* sparkline overlay (stream variant) */}
          {variant === "stream" && (
            <svg viewBox={`0 0 ${sparkline.length - 1} 1`} preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity: 0.6 }}>
              <polyline
                fill="none"
                stroke={`var(--st-${run.status})`}
                strokeWidth="0.04"
                vectorEffect="non-scaling-stroke"
                points={sparkline.map((v, i) => `${i},${1 - v}`).join(" ")}
              />
              {sparkline.map((v, i) => (
                <circle key={i} cx={i} cy={1 - v} r="0.04" fill={`var(--st-${run.status})`} vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          )}
          {/* label */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg)", minWidth: 0, fontFamily: "var(--font-mono)" }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {run.dur} · {run.iters} iter
            </span>
          </div>
          {/* current-position arrow for running runs in stream/editorial */}
          {running && (
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 2, background: `var(--st-${run.status})`, boxShadow: `0 0 8px var(--st-${run.status})` }} />
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenJobDetail, Gantt });
