import type { HubDatabase } from "../db/client";
import { listEventsAfterSequence } from "../db/queries";

type StreamEvent = Awaited<ReturnType<typeof listEventsAfterSequence>>[number];
type EventListener = (events: StreamEvent[]) => void;
type PulseListener = () => void;

export const sseHeaders = new Headers({
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "Content-Type": "text/event-stream; charset=utf-8",
});

export const createEventBroadcaster = () => {
  const eventListeners = new Set<EventListener>();
  const pulseListeners = new Set<PulseListener>();

  return {
    publish(events: StreamEvent[]) {
      if (events.length === 0) {
        return;
      }

      for (const listener of eventListeners) {
        listener(events);
      }
    },
    // Lifecycle telemetry (job/run started, run/job completed, planner
    // output) does not produce stream Events but still mutates DB state
    // the dashboard renders. `pulse()` is a payload-less notification
    // that nudges connected dashboards to re-fetch via router.refresh().
    pulse() {
      for (const listener of pulseListeners) {
        listener();
      }
    },
    subscribe(listener: EventListener) {
      eventListeners.add(listener);

      return () => {
        eventListeners.delete(listener);
      };
    },
    subscribePulse(listener: PulseListener) {
      pulseListeners.add(listener);

      return () => {
        pulseListeners.delete(listener);
      };
    },
  };
};

export type EventBroadcaster = ReturnType<typeof createEventBroadcaster>;

export const eventBroadcaster = createEventBroadcaster();

const textEncoder = new TextEncoder();

const parseLastEventId = (lastEventId: string | null) => {
  if (!lastEventId) {
    return 0;
  }

  const parsed = Number.parseInt(lastEventId, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
};

const serializeEvent = (event: StreamEvent) =>
  [
    `id: ${event.sequenceNumber}`,
    "event: event",
    `data: ${JSON.stringify(event)}`,
    "",
    "",
  ].join("\n");

// Pulses carry no payload and intentionally omit `id:` so they don't
// participate in Last-Event-ID resume — a missed pulse is harmless
// because subsequent real Events (or the next pulse) will trigger the
// dashboard refresh anyway.
const tickFrame = ["event: tick", "data:", "", ""].join("\n");

export const createSseEventStream = ({
  broadcaster,
  db,
  highWaterMark = 32,
  lastEventId,
  maxQueuedEvents = 1000,
  signal,
}: {
  broadcaster: EventBroadcaster;
  db: HubDatabase;
  highWaterMark?: number;
  lastEventId: string | null;
  maxQueuedEvents?: number;
  signal?: AbortSignal;
}) => {
  const pending: Uint8Array[] = [];
  const liveBuffer: StreamEvent[] = [];
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  let isClosed = false;
  let isBackfillComplete = false;
  let lastSentSequence = parseLastEventId(lastEventId);
  let unsubscribe: (() => void) | undefined;
  let unsubscribePulse: (() => void) | undefined;

  const close = () => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    unsubscribe?.();
    unsubscribePulse?.();
    try {
      controller?.close();
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  };

  const flush = () => {
    if (!controller || isClosed) {
      return;
    }

    while (pending.length > 0 && (controller.desiredSize ?? 0) > 0) {
      const chunk = pending.shift();

      if (chunk) {
        controller.enqueue(chunk);
      }
    }
  };

  const enqueue = (event: StreamEvent) => {
    if (isClosed || event.sequenceNumber <= lastSentSequence) {
      return;
    }

    lastSentSequence = event.sequenceNumber;
    pending.push(textEncoder.encode(serializeEvent(event)));

    if (pending.length > maxQueuedEvents) {
      close();
      return;
    }

    flush();
  };

  const enqueueTick = () => {
    if (isClosed) {
      return;
    }

    pending.push(textEncoder.encode(tickFrame));

    if (pending.length > maxQueuedEvents) {
      close();
      return;
    }

    flush();
  };

  return new ReadableStream<Uint8Array>(
    {
      async start(streamController) {
        controller = streamController;

        signal?.addEventListener("abort", close, { once: true });

        unsubscribe = broadcaster.subscribe((events) => {
          for (const event of events) {
            if (!isBackfillComplete) {
              liveBuffer.push(event);
              continue;
            }

            enqueue(event);
          }
        });
        unsubscribePulse = broadcaster.subscribePulse(() => {
          // Pulses can fire during backfill but they don't carry data
          // that needs ordering relative to the backfill batch — the
          // dashboard's debounced router.refresh() coalesces them.
          enqueueTick();
        });

        const backfillEvents = await listEventsAfterSequence(
          db,
          lastSentSequence,
        );

        for (const event of backfillEvents) {
          enqueue(event);
        }

        isBackfillComplete = true;

        for (const event of liveBuffer.sort(
          (left, right) => left.sequenceNumber - right.sequenceNumber,
        )) {
          enqueue(event);
        }

        liveBuffer.length = 0;
      },
      pull() {
        flush();
      },
      cancel() {
        close();
      },
    },
    { highWaterMark },
  );
};

export const createSseResponse = (
  db: HubDatabase,
  request: Request,
  broadcaster = eventBroadcaster,
) =>
  new Response(
    createSseEventStream({
      broadcaster,
      db,
      lastEventId: request.headers.get("last-event-id"),
      signal: request.signal,
    }),
    { headers: sseHeaders },
  );
