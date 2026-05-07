// Top bar shared across all desktop screens.
// Hub URL pill on the left near the wordmark, search in the middle,
// theme toggle + ⌘K hint on the right. No auth UI in local mode.

function AppShell({ theme = "dark", crumbs = [], children, focusedNav = null, hubBadge = "local · :7777", showCmdkHint = true, showThemeChooser = true, density = "comfortable", onTheme }) {
  return (
    <WTFrame theme={theme} density={density}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "100%" }}>
        <TopBar theme={theme} crumbs={crumbs} hubBadge={hubBadge} showCmdkHint={showCmdkHint} showThemeChooser={showThemeChooser} onTheme={onTheme} />
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </WTFrame>
  );
}

function TopBar({ theme, crumbs = [], hubBadge, showCmdkHint, showThemeChooser, onTheme }) {
  return (
    <div style={{
      height: 44, flex: "0 0 44px",
      display: "flex", alignItems: "center", gap: 14,
      padding: "0 16px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-elev)",
    }}>
      <Logo size={13} />

      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 2 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--st-succeeded)" }} />
        <Mono style={{ fontSize: 11, color: "var(--muted)" }}>{hubBadge}</Mono>
      </span>

      {crumbs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: "var(--muted-2)" }}>/</span>}
              <span style={{ fontSize: 13, color: i === crumbs.length - 1 ? "var(--fg)" : "var(--muted)", fontWeight: i === crumbs.length - 1 ? 500 : 400 }}>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* search hint */}
      <button style={{
        height: 26, padding: "0 8px 0 8px",
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 6, color: "var(--muted)", cursor: "pointer", fontSize: 12,
        minWidth: 220,
      }}>
        <I.search />
        <span>Search projects, jobs, runs…</span>
        <span style={{ flex: 1 }} />
        {showCmdkHint && <><Kbd>⌘</Kbd><Kbd>K</Kbd></>}
      </button>

      {showThemeChooser && (
        <div style={{
          display: "inline-flex", alignItems: "center",
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 6, height: 26, padding: 2,
        }}>
          {[
            { v: "system", icon: <I.laptop /> },
            { v: "light",  icon: <I.sun /> },
            { v: "dark",   icon: <I.moon /> },
          ].map(t => {
            const active = (t.v === "dark" && theme === "dark") || (t.v === "light" && theme === "light") || (t.v === "system" && theme === "system");
            return (
              <button key={t.v} onClick={() => onTheme && onTheme(t.v)} title={t.v}
                style={{
                  width: 26, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: active ? "var(--hover)" : "transparent",
                  color: active ? "var(--fg)" : "var(--muted)",
                  border: "none", borderRadius: 4, cursor: "pointer", padding: 0,
                }}>
                {t.icon}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AppShell, TopBar });
