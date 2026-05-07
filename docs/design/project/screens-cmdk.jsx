// ⌘K command palette overlay. Sits on top of a dimmed run-detail surface.

function ScreenCmdK({ theme = "dark" }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* dim background */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.55, pointerEvents: "none" }}>
        <ScreenJobDetail theme={theme} gantt="stream" />
      </div>
      {/* dim wash */}
      <div style={{ position: "absolute", inset: 0, background: theme === "dark" ? "rgba(8, 10, 14, 0.55)" : "rgba(20, 26, 36, 0.18)", backdropFilter: "blur(2px)" }} />
      {/* palette */}
      <div style={{ position: "absolute", top: 90, left: "50%", transform: "translateX(-50%)", width: 620 }}>
        <CmdK theme={theme} />
      </div>
    </div>
  );
}

function CmdK({ theme = "dark" }) {
  const groups = [
    {
      label: "Jump to run",
      hint: "matched by branch + message",
      items: [
        { st: "running",   icon: <I.tool />, text: "implementer · Round tax before promo deduction", meta: "checkout · 03:42" },
        { st: "running",   icon: <I.tool />, text: "implementer · Add idempotency key to checkout submit", meta: "checkout · 02:18" },
        { st: "succeeded", icon: <I.check />, text: "reviewer · Tiered shipping calculator", meta: "checkout · 14m ago" },
      ],
    },
    {
      label: "Jump to job",
      items: [
        { st: "running",   icon: <I.layers />, text: "fix: idempotent cart total when promo + tax + zero qty", meta: "checkout · running" },
        { st: "succeeded", icon: <I.layers />, text: "feat: tiered shipping calculator", meta: "checkout · 12m 41s" },
      ],
    },
    {
      label: "Actions",
      items: [
        { icon: <I.cancel />, text: "Cancel running job", kbd: ["⌘", "."] },
        { icon: <I.diff />,   text: "Compare last 30 runs by config hash", kbd: ["G", "C"] },
        { icon: <I.filter />, text: "Filter: only running, only Claude", kbd: ["F"] },
      ],
    },
    {
      label: "Go to",
      items: [
        { icon: <I.layers />, text: "Projects", kbd: ["G", "P"] },
        { icon: <I.inbox />,  text: "Inbox · 2 unread suggestions", kbd: ["G", "I"], badge: "2" },
        { icon: <I.cog />,    text: "Settings", kbd: ["G", ","] },
      ],
    },
  ];

  return (
    <WTFrame theme={theme} noScroll style={{ height: "auto", borderRadius: 10, boxShadow: "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px var(--border)", overflow: "hidden" }}>
      <div style={{ background: "var(--card)" }}>
        {/* input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <I.search />
          <input autoFocus defaultValue="tax round" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--fg)", fontSize: 15, fontFamily: "var(--font-sans)" }} />
          <Mono style={{ fontSize: 11, color: "var(--muted)" }}>4 of 148 runs</Mono>
          <Kbd>esc</Kbd>
        </div>

        {/* result groups */}
        <div style={{ maxHeight: 420, overflow: "auto" }}>
          {groups.map((g, gi) => (
            <div key={gi}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 6px" }}>
                <Mono style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{g.label}</Mono>
                {g.hint && <Mono style={{ fontSize: 10, color: "var(--muted-2)" }}>{g.hint}</Mono>}
              </div>
              {g.items.map((it, i) => {
                const active = gi === 0 && i === 0;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 16px",
                    background: active ? "var(--hover)" : "transparent",
                    borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  }}>
                    <span style={{ width: 22, height: 22, borderRadius: 5, background: "var(--card-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--fg-soft)" }}>{it.icon}</span>
                    {it.st && <span style={{ width: 6, height: 6, borderRadius: 99, background: `var(--st-${it.st})`, animation: it.st === "running" ? "wtPulse 1.6s ease-in-out infinite" : "none" }} />}
                    <span style={{ flex: 1, fontSize: 13, color: "var(--fg)" }}>{it.text}</span>
                    {it.badge && <Mono style={{ fontSize: 10, padding: "1px 6px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: 99 }}>{it.badge}</Mono>}
                    {it.meta && <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{it.meta}</Mono>}
                    {it.kbd && <span style={{ display: "inline-flex", gap: 3 }}>{it.kbd.map((k, j) => <Kbd key={j}>{k}</Kbd>)}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-elev)", fontSize: 11, color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Kbd>↵</Kbd> open</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Kbd>⌘</Kbd><Kbd>↵</Kbd> open in new tab</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>scope: <Mono>all projects</Mono> <Kbd>⌥</Kbd>P</span>
        </div>
      </div>
    </WTFrame>
  );
}

Object.assign(window, { ScreenCmdK, CmdK });
