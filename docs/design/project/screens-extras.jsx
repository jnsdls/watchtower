// V1.5 / V2 surfaces: empty Hub, global filters, comparison, expanded
// tool-call event, settings, sign-in.

function ScreenEmptyHub({ theme = "dark" }) {
  return (
    <AppShell theme={theme} crumbs={["Projects"]}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: 560, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--st-succeeded)" }} />
            <Mono style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Hub online · :7777 · pglite</Mono>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.015em" }}>Watching for runs.</h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.55, maxWidth: 480 }}>
              No Jobs yet. Start one from any repo with sandcastle installed —
              this view will update as soon as data lands.
            </p>
          </div>
          <div className="wt-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)" }}>
              <I.bash />
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>~/code/checkout</Mono>
              <span style={{ flex: 1 }} />
              <button className="wt-btn" data-variant="ghost"><I.copy /></button>
            </div>
            <div style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.7, color: "var(--fg)" }}>
              <span style={{ color: "var(--muted-2)" }}>$</span> watchtower run main.ts
            </div>
            <div style={{ padding: "0 16px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              <div><span style={{ color: "var(--st-succeeded)" }}>✓</span> sandcastle 0.4.2 detected</div>
              <div><span style={{ color: "var(--st-succeeded)" }}>✓</span> reporting to <Mono style={{ color: "var(--accent)" }}>http://localhost:7777</Mono></div>
              <div style={{ color: "var(--muted-2)" }}>waiting for sandcastle.run() …</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 4, border: "1px solid var(--border)", borderRadius: 7, background: "var(--card)", overflow: "hidden" }}>
            {[
              { t: "Read the docs", d: "Configure sandcastle, define a Job, ship one task.", h: "watchtower.com/docs", icon: <I.doc /> },
              { t: "Try a starter template", d: "plan / implement / review — copy into .sandcastle/main.ts", h: ".sandcastle/main.ts", icon: <I.layers /> },
              { t: "Configure Hub", d: "Port, retention, theme, integrations.", h: "Settings", icon: <I.cog /> },
            ].map((x, i, arr) => (
              <a key={i} className="wt-link" style={{
                display: "grid", gridTemplateColumns: "32px 1fr auto",
                alignItems: "center", gap: 12,
                padding: "12px 14px",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                color: "var(--fg-soft)",
              }}>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--card-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>{x.icon}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: "var(--fg)" }}>{x.t}</span>
                  <Mono style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.d}</Mono>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted-2)" }}>
                  <Mono>{x.h}</Mono>
                  <I.chev />
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ScreenFilters({ theme = "dark" }) {
  // Global filters / cross-project search above a runs table
  const facets = [
    { l: "Status", chips: [["running", "running", true], ["succeeded", "succeeded", true], ["failed", "failed", false], ["canceled", "canceled", false]] },
    { l: "Agent", chips: [["claudeCode", null, true], ["codex", null, false]] },
    { l: "Template", chips: [["plan-impl-review", null, true], ["worker", null, false], ["custom", null, false]] },
    { l: "Sandbox", chips: [["docker", null, true], ["podman", null, false], ["vercel", null, false]] },
  ];
  return (
    <AppShell theme={theme} crumbs={["Search"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* big search */}
        <div style={{ padding: "20px 28px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 38, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, flex: 1 }}>
              <I.search />
              <input defaultValue="tax round promo" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--fg)", fontSize: 14, fontFamily: "var(--font-sans)" }} />
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>matches across 6 projects</Mono>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="wt-btn">Last 24h <I.chevD /></button>
              <button className="wt-btn">Save view</button>
            </div>
          </div>
          {/* facets */}
          <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
            {facets.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{f.l}:</Mono>
                {f.chips.map(([label, st, on], j) => (
                  <span key={j} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 8px", fontSize: 11, borderRadius: 99, cursor: "pointer",
                    background: on ? (st ? `var(--st-${st}-bg)` : "var(--accent-bg)") : "transparent",
                    border: `1px solid ${on ? (st ? `var(--st-${st}-bd)` : "var(--accent-bd)") : "var(--border)"}`,
                    color: on ? (st ? `var(--st-${st})` : "var(--accent)") : "var(--muted)",
                    fontFamily: "var(--font-mono)",
                  }}>
                    {st && <span style={{ width: 5, height: 5, borderRadius: 99, background: `var(--st-${st})` }} />}
                    {label}
                    {on && <I.x />}
                  </span>
                ))}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted-2)", fontFamily: "var(--font-mono)" }}><I.plus />add</span>
              </div>
            ))}
          </div>
        </div>

        {/* result counts */}
        <div style={{ display: "flex", alignItems: "center", padding: "10px 28px", borderBottom: "1px solid var(--border)", gap: 14, fontSize: 12, color: "var(--muted)" }}>
          <Mono>148 runs · 27 jobs · 6 projects</Mono>
          <span style={{ flex: 1 }} />
          <Mono>group by:</Mono>
          {["job", "project", "config hash"].map((g, i) => (
            <span key={i} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 4, background: i === 0 ? "var(--hover)" : "transparent", color: i === 0 ? "var(--fg)" : "var(--muted)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>{g}</span>
          ))}
        </div>

        {/* results */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <table className="wt-table" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ width: 90 }}>When</th>
                <th style={{ width: 200 }}>Project</th>
                <th>Run</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 90 }}>Dur</th>
                <th style={{ width: 90, textAlign: "right" }}>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["14:02", "shopaurus/checkout", "implementer · Round tax before promo deduction", "running", "03:42", "108k"],
                ["13:18", "shopaurus/checkout", "reviewer · Tiered shipping calculator", "succeeded", "0:39", "22k"],
                ["12:55", "shopaurus/checkout", "worker · reproduce tax rounding bug", "succeeded", "3:02", "84k"],
                ["12:11", "shopaurus/checkout", "implementer · Cart total off by one cent", "failed", "1:56", "39k"],
                ["11:42", "shopaurus/checkout", "planner · Gift cards as a payment method", "succeeded", "0:24", "18k"],
                ["09:33", "maple-labs/ledger", "implementer · Posting reversal handler", "succeeded", "2:15", "61k"],
                ["08:01", "maple-labs/ledger", "reviewer · Round trip fixture", "succeeded", "0:48", "11k"],
                ["yesterday 22:14", "kettle/auth-gateway", "worker · OIDC refresh edge case", "succeeded", "4:51", "121k"],
              ].map((r, i) => (
                <tr key={i}>
                  <td><Mono style={{ fontSize: 12, color: "var(--muted)" }}>{r[0]}</Mono></td>
                  <td><Mono style={{ fontSize: 12 }}>{r[1]}</Mono></td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <Highlight text={r[2]} q={["tax", "round", "promo"]} />
                  </td>
                  <td><StatusPill status={r[3]} /></td>
                  <td><Mono>{r[4]}</Mono></td>
                  <td style={{ textAlign: "right" }}><Num>{r[5]}</Num></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Highlight({ text, q }) {
  let parts = [text];
  q.forEach(term => {
    const next = [];
    parts.forEach(p => {
      if (typeof p !== "string") { next.push(p); return; }
      const re = new RegExp(`(${term})`, "gi");
      const split = p.split(re);
      split.forEach((s, i) => {
        if (i % 2 === 1) next.push(<mark key={`${term}-${i}-${Math.random()}`} style={{ background: "var(--accent-bg)", color: "var(--accent)", padding: "0 2px", borderRadius: 2 }}>{s}</mark>);
        else if (s) next.push(s);
      });
    });
    parts = next;
  });
  return <>{parts.map((p, i) => typeof p === "string" ? <span key={i}>{p}</span> : p)}</>;
}

function ScreenComparison({ theme = "dark" }) {
  // Group runs by config hash and surface deltas. Two configs being compared.
  return (
    <AppShell theme={theme} crumbs={["Projects", "shopaurus/checkout", "Compare"]}>
      <div style={{ flex: 1, padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Compare runs</h1>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Grouped by <Mono>(config_hash, agent_model, sandbox_provider)</Mono> · 30-day window · 184 runs</div>
        </div>

        {/* config selector */}
        <div className="wt-card" style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", alignItems: "stretch" }}>
          <CompareGroup
            label="Baseline"
            hash="cfg_8a21"
            note="prompt v0.7 · maxIter 8"
            runs={42}
            metrics={[
              { l: "Tokens / run", v: "287k", n: "median" },
              { l: "Duration", v: "4m 12s", n: "median" },
              { l: "Success rate", v: "76%", n: "32 / 42" },
              { l: "Hit maxIter", v: "26%", n: "11 / 42" },
            ]}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", background: "var(--bg-elev)", fontSize: 18, fontFamily: "var(--font-mono)" }}>vs</div>
          <CompareGroup
            label="Variant"
            hash="cfg_b430"
            note="prompt v0.8 · maxIter 12"
            runs={38}
            highlight
            metrics={[
              { l: "Tokens / run", v: "201k", delta: -30, n: "−86k" },
              { l: "Duration", v: "3m 04s", delta: -27, n: "−1m 08s" },
              { l: "Success rate", v: "89%", delta: 13, n: "+13pp" },
              { l: "Hit maxIter", v: "8%", delta: -18, n: "−18pp", inverted: true },
            ]}
          />
        </div>

        {/* deltas as bar chart */}
        <div className="wt-card" style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Tokens per run · distribution</h2>
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>p50 ↓ 30% · p95 ↓ 18%</Mono>
          </div>
          <CompareDistribution />
        </div>

        {/* head to head table */}
        <div className="wt-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Run-by-run head-to-head</h2>
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>same Task across both configs</Mono>
          </div>
          <table className="wt-table">
            <thead><tr>
              <th>Task</th>
              <th style={{ width: 130 }}>Baseline cfg_8a21</th>
              <th style={{ width: 130 }}>Variant cfg_b430</th>
              <th style={{ width: 120, textAlign: "right" }}>Δ tokens</th>
              <th style={{ width: 110, textAlign: "right" }}>Δ duration</th>
            </tr></thead>
            <tbody>
              {[
                ["Apply zero-quantity guard in cart total", "311k · ✓ 2m 18s", "194k · ✓ 1m 28s", -38, -36],
                ["Round tax before promo deduction", "402k · ✗ 8m 42s", "208k · ✓ 3m 04s", -48, -65],
                ["Add idempotency key to checkout submit", "278k · ✓ 4m 11s", "201k · ✓ 3m 22s", -28, -19],
                ["Update price snapshot tests", "189k · ✓ 1m 42s", "151k · ✓ 1m 18s", -20, -23],
              ].map((r, i) => (
                <tr key={i}>
                  <td>{r[0]}</td>
                  <td><Mono style={{ fontSize: 12 }}>{r[1]}</Mono></td>
                  <td><Mono style={{ fontSize: 12 }}>{r[2]}</Mono></td>
                  <td style={{ textAlign: "right" }}><DeltaPill v={r[3]} /></td>
                  <td style={{ textAlign: "right" }}><DeltaPill v={r[4]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </AppShell>
  );
}

function CompareGroup({ label, hash, note, runs, metrics, highlight }) {
  return (
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14, background: highlight ? "var(--accent-bg)" : "transparent" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Mono style={{ fontSize: 11, color: highlight ? "var(--accent)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</Mono>
        <Mono style={{ fontSize: 12, color: "var(--fg)" }}>{hash}</Mono>
        <span style={{ flex: 1 }} />
        <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{runs} runs</Mono>
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-soft)" }}>{note}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {metrics.map((m, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.l}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <Mono style={{ fontSize: 20, color: "var(--fg)", fontWeight: 500 }}>{m.v}</Mono>
              {m.delta != null && <DeltaPill v={m.delta} inverted={m.inverted} />}
            </div>
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{m.n}</Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeltaPill({ v, inverted }) {
  // For "Hit maxIter" lower is better -> inverted means a negative delta is good.
  const good = inverted ? v < 0 : v < 0;
  const st = good ? "succeeded" : "failed";
  const sign = v > 0 ? "+" : "";
  return (
    <span className="wt-pill" data-st={st} style={{ height: 18, fontSize: 11 }}>
      <span className="dot" />{sign}{v}%
    </span>
  );
}

function CompareDistribution() {
  // Two faux histograms layered, with their p50 markers.
  const baseline = [3, 5, 7, 9, 14, 17, 20, 18, 14, 9, 5, 3, 2, 1, 1];
  const variant  = [4, 9, 13, 21, 26, 22, 14, 8, 4, 2, 1, 0, 0, 0, 0];
  const max = Math.max(...baseline, ...variant);
  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110 }}>
        {baseline.map((b, i) => (
          <div key={i} style={{ flex: 1, position: "relative", height: "100%" }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${(b / max) * 100}%`, background: "var(--muted-2)", opacity: 0.4, borderRadius: "2px 2px 0 0" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${(variant[i] / max) * 100}%`, background: "var(--accent)", opacity: 0.85, borderRadius: "2px 2px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
        {["50k", "100k", "150k", "200k", "250k", "300k", "350k", "400k", "450k", "500k+"].map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--muted-2)", opacity: 0.5, borderRadius: 2 }} />baseline cfg_8a21</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--accent)", borderRadius: 2 }} />variant cfg_b430</span>
      </div>
    </div>
  );
}

function ScreenToolCallExpanded({ theme = "dark" }) {
  // Run detail with one tool-call event expanded, showing args, output, duration
  return (
    <AppShell theme={theme} crumbs={["Projects", "shopaurus/checkout", "Job j_4f1c9a", "Run · implementer"]}>
      <div style={{ flex: 1, padding: "20px 28px 32px", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Mono style={{ fontSize: 11, color: "var(--muted)" }}>RUN · r_4f1c9a · iteration 3 → 4</Mono>
          <StatusPill status="running" />
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Tool call detail</h1>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Click any tool card on the run timeline to expand its args / output / duration.</div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* collapsed text */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px", display: "flex", gap: 10 }}>
            <Mono style={{ fontSize: 10, color: "var(--muted)", width: 30 }}>0:41</Mono>
            <div style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.55 }}>Snapshot is green. Now checking that the upstream reservation API still receives the un-rounded value.</div>
          </div>

          {/* expanded tool call */}
          <div style={{ background: "var(--card)", border: "1px solid var(--accent-bd)", borderRadius: 6, overflow: "hidden", boxShadow: "0 0 0 2px var(--accent-bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
              <Mono style={{ fontSize: 10, color: "var(--muted)", width: 30 }}>0:46</Mono>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: "var(--card-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><I.doc /></span>
              <Mono style={{ fontSize: 13, color: "var(--fg)" }}>read</Mono>
              <Mono style={{ fontSize: 12, color: "var(--muted)" }}>src/pricing/reserve-payload.ts</Mono>
              <span style={{ flex: 1 }} />
              <Mono style={{ fontSize: 11, color: "var(--muted)" }}>88 lines · 55ms</Mono>
              <button className="wt-btn" data-variant="ghost"><I.chevD /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--border)" }}>
              <div style={{ padding: "12px 14px", borderRight: "1px solid var(--border)" }}>
                <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>arguments</Mono>
                <pre style={{ margin: "8px 0 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
{`{
  "path": "src/pricing/reserve-payload.ts",
  "offset": 0,
  "limit": 200
}`}
                </pre>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>output · 88 lines</Mono>
                <pre style={{ margin: "8px 0 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-soft)", lineHeight: 1.6, whiteSpace: "pre", overflow: "hidden", textOverflow: "ellipsis" }}>
{`import { CartTotal } from "./cart-total";
import type { ReservePayload } from "@/types";

/** Build the payload sent to the inventory
 *  reservation service. Receives the raw
 *  pre-rounded subtotal so downstream`}
                </pre>
                <button className="wt-btn" data-variant="ghost" style={{ marginTop: 8 }}>show all 88 lines</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "10px 14px", background: "var(--bg-elev)", fontSize: 11, color: "var(--muted)" }}>
              <Mono>process: sandbox-docker-9c</Mono>
              <span>·</span>
              <Mono>cwd: /repo/checkout</Mono>
              <span>·</span>
              <Mono>exit: 0</Mono>
              <span style={{ flex: 1 }} />
              <a className="wt-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>open file in IDE <I.ext /></a>
            </div>
          </div>

          {/* collapsed bash next */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", display: "flex", gap: 10, alignItems: "center" }}>
            <Mono style={{ fontSize: 10, color: "var(--muted)", width: 30 }}>1:08</Mono>
            <span style={{ width: 22, height: 22, borderRadius: 5, background: "var(--card-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><I.bash /></span>
            <Mono style={{ fontSize: 12 }}>bash</Mono>
            <Mono style={{ fontSize: 12, color: "var(--muted)", flex: 1 }}>pnpm typecheck</Mono>
            <Mono style={{ fontSize: 11, color: "var(--st-succeeded)" }}>0 errors</Mono>
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>3.8s</Mono>
            <I.chev />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ScreenSettings({ theme = "dark" }) {
  return (
    <AppShell theme={theme} crumbs={["Settings"]}>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "200px 1fr", overflow: "hidden" }}>
        <nav style={{ borderRight: "1px solid var(--border)", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2, background: "var(--bg-elev)" }}>
          {[
            ["Hub", true],
            ["Storage", false],
            ["Theme", false],
            ["Keyboard", false],
            ["Notifications", false],
            ["Auto-improve", false],
            ["About", false],
          ].map(([l, a], i) => (
            <span key={i} style={{ padding: "6px 10px", fontSize: 13, color: a ? "var(--fg)" : "var(--muted)", background: a ? "var(--hover)" : "transparent", borderRadius: 4, cursor: "pointer" }}>{l}</span>
          ))}
        </nav>
        <div style={{ padding: "24px 32px", overflow: "auto", display: "flex", flexDirection: "column", gap: 22, maxWidth: 720 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Hub</h1>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Where Watchtower listens and where it stores data. Restart the Hub for these to take effect.</div>
          </div>

          <SettingsField label="Bind address" hint="localhost only by default. Use 0.0.0.0 to expose Hub on LAN.">
            <input defaultValue="127.0.0.1" style={inputStyle()} />
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>:</Mono>
            <input defaultValue="7777" style={{ ...inputStyle(), width: 80 }} />
          </SettingsField>

          <SettingsField label="Data directory" hint="pglite stores its embedded Postgres files here.">
            <Mono style={{ flex: 1, padding: "0 10px", fontSize: 12, color: "var(--fg-soft)" }}>~/.watchtower/data</Mono>
            <button className="wt-btn">Change…</button>
          </SettingsField>

          <SettingsField label="Retention" hint="Delete Run events older than this. Token totals are kept indefinitely.">
            <select defaultValue="30" style={{ ...inputStyle(), width: 160 }}>
              <option>7 days</option><option>14 days</option><option value="30">30 days</option><option>90 days</option><option>forever</option>
            </select>
            <Mono style={{ fontSize: 11, color: "var(--muted)" }}>≈ 412 MB on disk · last GC ran 2h ago</Mono>
          </SettingsField>

          <SettingsField label="Auto-update" hint="Watchtower will install patch updates silently when no Jobs are running.">
            <Toggle on />
          </SettingsField>

          <div style={{ height: 1, background: "var(--border)" }} />

          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Pair with watchtower.com</h2>
          <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 520 }}>
            Hybrid mode forwards Hub events to your account so you can watch Runs from another device. Local-only operation is unaffected.
          </div>
          <div className="wt-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
            <I.cloud />
            <div style={{ flex: 1 }}>
              <Mono style={{ fontSize: 12 }}>not paired</Mono>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Pair with a watchtower.com account to enable phone watching, share links, and Hybrid Runners.</div>
            </div>
            <button className="wt-btn" data-variant="primary">Pair Hub</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SettingsField({ label, hint, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24 }}>
      <div>
        <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
    </div>
  );
}

function inputStyle() {
  return {
    height: 30, padding: "0 10px", background: "var(--card)",
    border: "1px solid var(--border)", borderRadius: 5,
    color: "var(--fg)", fontFamily: "var(--font-mono)", fontSize: 12,
    minWidth: 120,
  };
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 30, height: 18, borderRadius: 99,
      background: on ? "var(--accent)" : "var(--card-soft)",
      border: "1px solid var(--border)",
      position: "relative", cursor: "pointer",
    }}>
      <div style={{ position: "absolute", top: 1, left: on ? 13 : 1, width: 14, height: 14, borderRadius: 99, background: "var(--fg)", transition: "left .15s" }} />
    </div>
  );
}

function ScreenSignIn({ theme = "dark" }) {
  return (
    <WTFrame theme={theme} noScroll>
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 22 }}>
          <Logo size={16} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Sign in to watchtower.com</h1>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.55 }}>
              Watch your Hub from any device. Cloud is optional — your local Hub works without an account.
            </div>
          </div>
          <button style={{ ...inputStyle(), height: 40, justifyContent: "center", display: "flex", alignItems: "center", gap: 8, background: "var(--fg)", color: "var(--bg)", border: "none", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <I.github /> Continue with GitHub
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} /><span>or</span><div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input placeholder="you@company.com" style={{ ...inputStyle(), height: 36, fontFamily: "var(--font-sans)", fontSize: 13 }} />
            <button style={{ ...inputStyle(), height: 36, justifyContent: "center", display: "flex", alignItems: "center", color: "var(--fg-soft)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-sans)" }}>Send magic link</button>
          </div>
          <div className="wt-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <I.laptop />
            <div style={{ flex: 1, fontSize: 12, color: "var(--muted)" }}>
              <Mono style={{ fontSize: 11, color: "var(--fg-soft)" }}>Local Hub detected</Mono>
              <div>::7777 · we'll pair this Hub after sign-in.</div>
            </div>
          </div>
        </div>
      </div>
    </WTFrame>
  );
}

Object.assign(window, {
  ScreenEmptyHub, ScreenFilters, ScreenComparison, ScreenToolCallExpanded, ScreenSettings, ScreenSignIn,
});
