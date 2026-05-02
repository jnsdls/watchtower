# Hub framework: Next.js (App Router)

Watchtower's Hub combines an HTTP API, a real-time event channel, and the
Dashboard frontend in a single long-lived process. We chose Next.js with
the App Router because it provides route handlers, streaming responses
(the basis for SSE in ADR 0002), and the Dashboard build pipeline in one
project — minimizing wiring and matching the maintainer's existing
fluency. The trade-offs are that Next.js doesn't run a WebSocket server
in route handlers (forcing the SSE-and-HTTP transport in ADR 0002) and
that distribution requires Next.js's standalone output mode rather than
a plain library publish.

## Considered options

- **Hono on `Bun.serve`** — small, fast, no opinions; but separates the
  frontend bundler from the API, increasing wiring.
- **Express / Fastify + separate Vite frontend** — two projects to
  coordinate, more glue code.
- **Bun's built-in HTTP server + handwritten SSR** — most from-scratch;
  we'd own ESM bundling, hydration, and routing.

## Consequences

- Distribution: Hub publishes via Next.js's standalone output mode;
  `watchtower hub start` invokes the standalone server programmatically.
- Frontend lives inside `packages/hub` as Next.js App Router pages
  alongside route handlers — no separate frontend package.
- The Hub runs on Node by default (Next.js's primary supported runtime);
  the Bun + Node runtime decision in ADR 0003 applies to the Runner, not
  the Hub.
