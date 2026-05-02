# Transport: SSE + HTTP (no WebSocket)

Following the choice of Next.js (ADR 0001), all live-update paths use
HTTP-native primitives instead of WebSocket. Hub→Dashboard runs over
Server-Sent Events on a streaming route handler; Runner→Hub events go
via batched HTTP POST; Hub→Runner cancels travel over a long-poll GET
held open by the Runner per active Run. This stays inside Next.js's
route handlers (no custom `server.ts`), avoids the WebSocket-on-Next.js
complexity, and remains portable to any HTTP-only deployment target.

## Considered options

- **WebSocket everywhere** — single transport, but requires a custom
  Next.js `server.ts` wrapping the request handler with a
  `ws`-library upgrade path.
- **Mixed (SSE Hub→Dashboard + WS Runner↔Hub)** — still requires the
  custom server for the WS surface.
- **Polling for everything** — simplest, worst real-time UX.

## Consequences

- Browser `EventSource` provides auto-reconnect for free; the SSE
  handler must support `Last-Event-ID` resume to avoid event loss
  across reconnects.
- Cancel commands fire roughly once per Run at most; long-poll's
  per-cycle latency is acceptable.
- **Vercel Fluid Compute (V2 cloud target):** SSE connections incur
  provisioned-memory billing for the entire connection lifetime
  (~$0.011/hr per connection on Pro / IAD). Active CPU pauses on I/O
  wait so the actual computation is essentially free. The 800s
  max-function-duration on Pro forces a reconnect cycle every ~13
  minutes; this is acceptable but must be designed in. V1 local
  hosting has none of these concerns.
- The architecture stays portable — if V2 cost economics push the Hub
  off Vercel (Fly, Railway, Render), nothing in the transport changes.
