// Mock data for all screens. Pulled from realistic repo names + agent
// terminology; consistent across screens so a Job here links to the same Run
// over there if the user starts comparing.

const projects = [
  { id: "p1", name: "shopaurus/checkout", url: "github.com/shopaurus/checkout", jobs: 47, runs: 312, latest: "2m ago", desc: "Edge cases in cart pricing + tax", running: 3 },
  { id: "p2", name: "nebula-gg/watchtower", url: "github.com/nebula-gg/watchtower", jobs: 22, runs: 184, latest: "12m ago", desc: "Self-hosting dogfood", running: 0 },
  { id: "p3", name: "maple-labs/ledger", url: "github.com/maple-labs/ledger", jobs: 31, runs: 226, latest: "1h ago", desc: "Posting reversal + idempotency", running: 1 },
  { id: "p4", name: "atlas/payments-svc", url: "github.com/atlas-co/payments-svc", jobs: 9, runs: 41, latest: "3d ago", desc: "Stripe webhook hardening", running: 0 },
  { id: "p5", name: "kettle/auth-gateway", url: "github.com/kettle-eng/auth-gateway", jobs: 14, runs: 88, latest: "5h ago", desc: "OIDC refresh token edge cases", running: 0 },
  { id: "p6", name: "shopaurus/storefront-web", url: "github.com/shopaurus/storefront-web", jobs: 19, runs: 102, latest: "7h ago", desc: "Server actions migration", running: 0 },
];

const jobs = [
  { id: "j1", template: "plan-impl-review", started: "14:02:31", duration: "running · 04:18", status: "running", runs: 7, tokens: "412k", branch: "main", message: "fix: idempotent cart total when promo + tax + zero qty" },
  { id: "j2", template: "plan-impl-review", started: "13:18:09", duration: "12m 41s", status: "succeeded", runs: 9, tokens: "1.2M", branch: "main", message: "feat: tiered shipping calculator" },
  { id: "j3", template: "worker", started: "12:55:44", duration: "3m 02s", status: "succeeded", runs: 1, tokens: "84k", branch: "fix/tax-edge", message: "ad-hoc: reproduce tax rounding bug" },
  { id: "j4", template: "plan-impl-review", started: "12:11:19", duration: "8m 56s", status: "failed", runs: 6, tokens: "672k", branch: "main", message: "fix: cart total off by one cent on multi-currency" },
  { id: "j5", template: "plan-impl-review", started: "11:42:08", duration: "running · 22:04", status: "running", runs: 4, tokens: "298k", branch: "main", message: "feat: gift cards as a payment method" },
  { id: "j6", template: "worker", started: "10:55:30", duration: "1m 18s", status: "canceled", runs: 1, tokens: "—", branch: "main", message: "explore: codex on stripe webhook test", agent: "codex" },
  { id: "j7", template: "plan-impl-review", started: "09:33:12", duration: "16m 29s", status: "succeeded", runs: 11, tokens: "1.8M", branch: "main", message: "fix: race in inventory reserve flow" },
  { id: "j8", template: "plan-impl-review", started: "08:01:47", duration: "21m 03s", status: "succeeded", runs: 14, tokens: "2.4M", branch: "main", message: "refactor: extract pricing engine module" },
  { id: "j9", template: "worker", started: "yesterday 22:14", duration: "4m 51s", status: "succeeded", runs: 1, tokens: "121k", branch: "main", message: "chore: bump zod, fix breaking changes" },
];

const tasks = [
  { id: "t1", title: "Apply zero-quantity guard in cart total", branch: "fix/cart-zero-qty", status: "succeeded", runs: 3 },
  { id: "t2", title: "Round tax to nearest cent before promo deduction", branch: "fix/tax-round-order", status: "running", runs: 2 },
  { id: "t3", title: "Add idempotency key to checkout submit", branch: "fix/idem-checkout", status: "running", runs: 2 },
  { id: "t4", title: "Update price snapshot tests for new ordering", branch: "fix/price-snapshots", status: "running", runs: 1 },
];

// Run timeline: positions are 0..1 along a 4:18 (~258s) running job
// We'll bucket-by-Task-then-Run-name in the swimlane gantt.
const runs = [
  // Planner first
  { id: "r1", name: "planner", task: null, status: "succeeded", agent: "claudeCode", model: "claude-sonnet-4.5", sandbox: "docker", iters: 4, tokens: { in: 41200, out: 8400, cr: 22100, cc: 9100 }, t: [0.00, 0.07], dur: "18s" },
  // Per-task lanes
  { id: "r2", name: "implementer", task: "t1", status: "succeeded", agent: "claudeCode", iters: 6, tokens: { in: 38400, out: 12100, cr: 19200, cc: 4400 }, t: [0.08, 0.42], dur: "1m 28s" },
  { id: "r3", name: "reviewer",    task: "t1", status: "succeeded", agent: "claudeCode", iters: 3, tokens: { in: 22100, out: 5800,  cr: 11200, cc: 2200 }, t: [0.43, 0.58], dur: "39s" },
  { id: "r4", name: "implementer", task: "t2", status: "running",   agent: "claudeCode", iters: 5, tokens: { in: 51200, out: 13900, cr: 31200, cc: 7800 }, t: [0.10, 1.00], dur: "running" },
  { id: "r5", name: "reviewer",    task: "t2", status: "running",   agent: "claudeCode", iters: 1, tokens: { in: 9100,  out: 2200,  cr: 4400,  cc: 800  }, t: [0.78, 1.00], dur: "running" },
  { id: "r6", name: "implementer", task: "t3", status: "running",   agent: "claudeCode", iters: 4, tokens: { in: 42100, out: 11200, cr: 22000, cc: 6100 }, t: [0.18, 1.00], dur: "running" },
  { id: "r7", name: "reviewer",    task: "t3", status: "succeeded", agent: "claudeCode", iters: 2, tokens: { in: 14200, out: 3300,  cr: 7100,  cc: 1100 }, t: [0.62, 0.78], dur: "44s" },
  { id: "r8", name: "implementer", task: "t4", status: "failed",    agent: "claudeCode", iters: 6, tokens: { in: 39800, out: 9200,  cr: 18900, cc: 3800 }, t: [0.10, 0.55], dur: "1m 56s" },
  { id: "r9", name: "merger",      task: null, status: "running",   agent: "claudeCode", iters: 0, tokens: null,                                                t: [0.92, 1.00], dur: "queued" },
];

// Run detail focus
const runFocus = {
  id: "r4",
  name: "implementer",
  task: "Round tax to nearest cent before promo deduction",
  branch: "fix/tax-round-order",
  job: "j1",
  status: "running",
  agent: "claudeCode",
  model: "claude-sonnet-4.5",
  sandbox: "docker",
  started: "14:03:09",
  elapsed: "03:42",
  maxIter: 12,
  iterations: 1, // most runs are one-shots; turns are the LLM cycles within
  turnsTotal: 5,
  iters: [
    { n: 1, in: 8200, out: 2100, cr: 4400, cc: 1600, dur: "0:14", events: 4 },
    { n: 2, in: 9400, out: 2700, cr: 5500, cc: 1700, dur: "0:18", events: 6 },
    { n: 3, in: 10300, out: 2900, cr: 6800, cc: 1500, dur: "0:21", events: 7 },
    { n: 4, in: 11500, out: 3100, cr: 7700, cc: 1500, dur: "0:23", events: 9 },
    { n: 5, in: 11800, out: 3100, cr: 6800, cc: 1500, dur: "running", events: 5, running: true },
  ],
  events: [
    { iter: 1, kind: "text", t: "0:00", body: "Reading the failing snapshot. The promo deduction runs before tax rounding which causes the off-by-one when cart total hits a half-cent boundary." },
    { iter: 1, kind: "tool", t: "0:04", name: "read", args: "src/pricing/cart-total.ts", lines: 142, dur: "62ms" },
    { iter: 1, kind: "tool", t: "0:05", name: "grep", args: "applyPromo|roundTax", matches: 7, dur: "44ms" },
    { iter: 2, kind: "text", t: "0:14", body: "I'll move roundTax above applyPromo in the reducer chain and add a regression test from the failing snapshot." },
    { iter: 2, kind: "tool", t: "0:18", name: "edit", args: "src/pricing/cart-total.ts", changes: "+4 -2", dur: "120ms" },
    { iter: 2, kind: "tool", t: "0:22", name: "edit", args: "src/pricing/cart-total.test.ts", changes: "+18 -0", dur: "98ms" },
    { iter: 3, kind: "tool", t: "0:34", name: "bash", args: "pnpm test pricing -- --run", out: "12 passed (1.4s)", dur: "1.4s" },
    { iter: 3, kind: "text", t: "0:41", body: "Snapshot is green. Now checking that the upstream reservation API still receives the un-rounded value." },
    { iter: 3, kind: "tool", t: "0:46", name: "read", args: "src/pricing/reserve-payload.ts", lines: 88, dur: "55ms" },
    { iter: 4, kind: "text", t: "0:55", body: "Reservation payload uses pre-rounded subtotal. Safe. Adding a comment to anchor the invariant." },
    { iter: 4, kind: "tool", t: "1:01", name: "edit", args: "src/pricing/cart-total.ts", changes: "+3 -0", dur: "84ms" },
    { iter: 4, kind: "tool", t: "1:08", name: "bash", args: "pnpm typecheck", out: "0 errors", dur: "3.8s" },
    { iter: 5, kind: "text", t: "1:21", body: "Running full test suite to be sure I didn't break anything in adjacent reducers." },
    { iter: 5, kind: "tool", t: "1:26", name: "bash", args: "pnpm test", out: "running…", running: true },
  ],
};

Object.assign(window, { projects, jobs, tasks, runs, runFocus });
