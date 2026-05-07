// Project list (/) and Project detail (/projects/:id) and Run detail.
// Both light + dark variants come from the parent passing `theme`.

function ScreenProjectList({ theme = "dark" }) {
  return (
    <AppShell theme={theme} crumbs={["Projects"]}>
      <div style={{ flex: 1, padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Projects</h1>
          <Mono style={{ fontSize: 12, color: "var(--muted)" }}>{projects.length} · 4 active in last 24h</Mono>
          <span style={{ flex: 1 }} />
          <button className="wt-btn"><I.filter /> Filter</button>
        </div>

        <div className="wt-card" style={{ overflow: "hidden" }}>
          <table className="wt-table">
            <thead>
              <tr>
                <th style={{ width: "32%" }}>Project</th>
                <th>Latest activity</th>
                <th style={{ textAlign: "right" }}>Jobs</th>
                <th style={{ textAlign: "right" }}>Runs</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <I.github />
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ color: "var(--fg)", fontWeight: 500 }}>{p.name}</span>
                        <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{p.url}</Mono>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {p.running > 0 ? <StatusPill status="running" label={`${p.running} running`} /> : <Mono style={{ fontSize: 12, color: "var(--muted)" }}>{p.latest}</Mono>}
                      {p.running > 0 && <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{p.latest}</Mono>}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}><Num style={{ color: "var(--fg)" }}>{p.jobs}</Num></td>
                  <td style={{ textAlign: "right" }}><Num style={{ color: "var(--fg)" }}>{p.runs}</Num></td>
                  <td style={{ color: "var(--muted)" }}><I.chev /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function ScreenProjectDetail({ theme = "dark" }) {
  const p = projects[0];
  return (
    <AppShell theme={theme} crumbs={["Projects", p.name]}>
      <div style={{ flex: 1, padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{p.name}</h1>
              <a className="wt-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)" }}><I.ext /> {p.url}</a>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{p.desc}</div>
          </div>
          <button className="wt-btn"><I.copy /> Copy run command</button>
        </div>

        {/* metric strip */}
        <div className="wt-card" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {[
            { l: "Jobs (24h)", v: "12", s: "↑ 3 vs prev day" },
            { l: "Active runs", v: "4", s: "across 2 jobs", running: true },
            { l: "Tokens (24h)", v: "8.2M", s: "$24.18 est." },
            { l: "Success rate", v: "89%", s: "30d rolling" },
          ].map((m, i) => (
            <div key={i} className="wt-metric" style={{ borderRight: i < 3 ? "1px solid var(--border)" : "none" }}>
              <div className="wt-metric-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {m.l}
                {m.running && <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--st-running)", animation: "wtPulse 1.6s ease-in-out infinite" }} />}
              </div>
              <div className="wt-metric-value">{m.v}</div>
              <div className="wt-metric-sub">{m.s}</div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 2, marginBottom: -1 }}>
            {[["Jobs", true, jobs.length], ["Runs", false, p.runs], ["Templates", false, 3], ["Settings", false, null]].map(([t, a, c], i) => (
              <div key={i} style={{ height: 34, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 7, color: a ? "var(--fg)" : "var(--muted)", borderBottom: a ? "1px solid var(--fg)" : "1px solid transparent", fontSize: 13, cursor: "pointer" }}>
                {t}
                {c != null && <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{c}</Mono>}
              </div>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <button className="wt-btn"><I.filter /> Status: any</button>
            <button className="wt-btn">Last 24h <I.chevD /></button>
          </div>
        </div>

        {/* jobs table */}
        <div className="wt-card" style={{ overflow: "hidden" }}>
          <table className="wt-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Started</th>
                <th>Job</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 90 }}>Duration</th>
                <th style={{ width: 60, textAlign: "right" }}>Runs</th>
                <th style={{ width: 80, textAlign: "right" }}>Tokens</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td><Mono style={{ fontSize: 12, color: "var(--muted)" }}>{j.started}</Mono></td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "var(--fg)" }}>{j.message}</span>
                      <div style={{ display: "flex", gap: 10, color: "var(--muted)", fontSize: 11 }}>
                        <Mono>{j.template}</Mono>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><I.branch />{j.branch}</span>
                        {j.agent === "codex" && <Mono style={{ color: "var(--pv-codex)" }}>codex</Mono>}
                      </div>
                    </div>
                  </td>
                  <td><StatusPill status={j.status} /></td>
                  <td><Mono style={{ fontSize: 12 }}>{j.duration}</Mono></td>
                  <td style={{ textAlign: "right" }}><Num>{j.runs}</Num></td>
                  <td style={{ textAlign: "right" }}><Num>{j.tokens}</Num></td>
                  <td><I.chev /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { ScreenProjectList, ScreenProjectDetail });
