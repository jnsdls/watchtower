// app.jsx — wires every screen onto the design canvas with a Tweaks panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#7a5af0"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // accent override — tweaks.accent is a hex string from TweakColor
  React.useEffect(() => {
    const map = {
      "#7a5af0": { dark: "0.66 0.18 290", light: "0.52 0.20 290" }, // purple (default)
      "#b07af0": { dark: "0.72 0.16 310", light: "0.56 0.18 310" }, // magenta-purple
      "#3b8edb": { dark: "0.66 0.13 232", light: "0.52 0.16 232" }, // sentinel sky
    };
    const v = map[tweaks.accent] || map["#7a5af0"];
    const css = `
      .wt[data-theme="dark"]  { --accent: oklch(${v.dark}); --accent-bg: oklch(${v.dark} / 0.16); --accent-bd: oklch(${v.dark} / 0.42); }
      .wt[data-theme="light"] { --accent: oklch(${v.light}); --accent-bg: oklch(${v.light} / 0.10); --accent-bd: oklch(${v.light} / 0.32); }
    `;
    let s = document.getElementById("wt-accent");
    if (!s) { s = document.createElement("style"); s.id = "wt-accent"; document.head.appendChild(s); }
    s.textContent = css;
  }, [tweaks.accent]);

  return (
    <>
      <DesignCanvas>
        <DCSection id="foundations" title="Foundations" subtitle="Type, color, status, patterns. Dark + Light. The system every screen is composed from.">
          <DCArtboard id="f-type-d" label="Type · dark" width={520} height={520}><div style={{ width:"100%", height:"100%" }}><FoundationType theme="dark" /></div></DCArtboard>
          <DCArtboard id="f-type-l" label="Type · light" width={520} height={520}><div style={{ width:"100%", height:"100%" }}><FoundationType theme="light" /></div></DCArtboard>
          <DCArtboard id="f-color-d" label="Tokens · dark" width={520} height={520}><div style={{ width:"100%", height:"100%" }}><FoundationColor theme="dark" /></div></DCArtboard>
          <DCArtboard id="f-color-l" label="Tokens · light" width={520} height={520}><div style={{ width:"100%", height:"100%" }}><FoundationColor theme="light" /></div></DCArtboard>
          <DCArtboard id="f-status-d" label="Status · dark" width={520} height={420}><div style={{ width:"100%", height:"100%" }}><FoundationStatus theme="dark" /></div></DCArtboard>
          <DCArtboard id="f-status-l" label="Status · light" width={520} height={420}><div style={{ width:"100%", height:"100%" }}><FoundationStatus theme="light" /></div></DCArtboard>
          <DCArtboard id="f-pat-d" label="Patterns · dark" width={1060} height={460}><div style={{ width:"100%", height:"100%" }}><FoundationPatterns theme="dark" /></div></DCArtboard>
          <DCArtboard id="f-pat-l" label="Patterns · light" width={1060} height={460}><div style={{ width:"100%", height:"100%" }}><FoundationPatterns theme="light" /></div></DCArtboard>
        </DCSection>

        <DCSection id="core" title="Core screens · V1" subtitle="The four screens that exist today. Dark first, light second.">
          <DCArtboard id="proj-list-d" label="Project list · dark" width={1280} height={760}><ScreenProjectList theme="dark" /></DCArtboard>
          <DCArtboard id="proj-list-l" label="Project list · light" width={1280} height={760}><ScreenProjectList theme="light" /></DCArtboard>
          <DCArtboard id="proj-d-d" label="Project detail · dark" width={1280} height={920}><ScreenProjectDetail theme="dark" /></DCArtboard>
          <DCArtboard id="proj-d-l" label="Project detail · light" width={1280} height={920}><ScreenProjectDetail theme="light" /></DCArtboard>
        </DCSection>

        <DCSection id="job" title="Job detail" subtitle="The Gantt is one of two bespoke surfaces. Refined direction — clean bars, tick density, status-driven fills.">
          <DCArtboard id="job-d" label="Job detail · dark" width={1280} height={1100}><ScreenJobDetail theme="dark" gantt="refined" /></DCArtboard>
          <DCArtboard id="job-l" label="Job detail · light" width={1280} height={1100}><ScreenJobDetail theme="light" gantt="refined" /></DCArtboard>
        </DCSection>

        <DCSection id="run" title="Run detail" subtitle="A Run has ≥1 Iterations; each Iteration has N Turns until it completes or fails. Turns are unbounded — we never show a max. The iteration switcher only chrome-up when iterations > 1.">
          <DCArtboard id="run-d" label="Run detail · one-shot · dark" width={1440} height={1100}><ScreenRunDetail theme="dark" /></DCArtboard>
          <DCArtboard id="run-l" label="Run detail · one-shot · light" width={1440} height={1100}><ScreenRunDetail theme="light" /></DCArtboard>
          <DCArtboard id="run-multi-d" label="Run detail · multi-iteration · dark" width={1440} height={1100}><ScreenRunDetailMultiIter theme="dark" /></DCArtboard>
          <DCArtboard id="run-tool-d" label="Tool-call · expanded" width={1280} height={760}><ScreenToolCallExpanded theme="dark" /></DCArtboard>
        </DCSection>

        <DCSection id="extras" title="V1.5 surfaces" subtitle="Empty Hub, global filters / search, comparison view, settings, sign-in.">
          <DCArtboard id="empty-d" label="Empty Hub · dark" width={1280} height={760}><ScreenEmptyHub theme="dark" /></DCArtboard>
          <DCArtboard id="empty-l" label="Empty Hub · light" width={1280} height={760}><ScreenEmptyHub theme="light" /></DCArtboard>
          <DCArtboard id="filt-d" label="Global filters · dark" width={1280} height={820}><ScreenFilters theme="dark" /></DCArtboard>
          <DCArtboard id="comp-d" label="Comparison · dark" width={1280} height={1080}><ScreenComparison theme="dark" /></DCArtboard>
          <DCArtboard id="set-d" label="Settings · dark" width={1280} height={760}><ScreenSettings theme="dark" /></DCArtboard>
          <DCArtboard id="sign-d" label="Sign in (cloud) · dark" width={720} height={620}><ScreenSignIn theme="dark" /></DCArtboard>
          <DCArtboard id="sign-l" label="Sign in (cloud) · light" width={720} height={620}><ScreenSignIn theme="light" /></DCArtboard>
        </DCSection>

        <DCSection id="cmdk" title="⌘K Command palette" subtitle="Modal over the current surface. Mixes runs, jobs, actions, and navigation in one ranked list.">
          <DCArtboard id="cmdk-d" label="⌘K · over Job detail · dark" width={1280} height={760}><ScreenCmdK theme="dark" /></DCArtboard>
          <DCArtboard id="cmdk-l" label="⌘K · over Job detail · light" width={1280} height={760}><ScreenCmdK theme="light" /></DCArtboard>
        </DCSection>

        <DCSection id="mobile" title="Mobile (Hybrid)" subtitle="Phone-sized treatment of the two surfaces users will keep open while AFK.">
          <DCArtboard id="mob-job-d" label="Mobile · Job · dark" width={390} height={780}><ScreenMobileJob theme="dark" /></DCArtboard>
          <DCArtboard id="mob-job-l" label="Mobile · Job · light" width={390} height={780}><ScreenMobileJob theme="light" /></DCArtboard>
          <DCArtboard id="mob-run-d" label="Mobile · Run · dark" width={390} height={780}><ScreenMobileRun theme="dark" /></DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent" />
        <TweakColor
          label="Hue"
          value={tweaks.accent}
          options={["#7a5af0", "#b07af0", "#3b8edb"]}
          onChange={(v) => setTweak("accent", v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
