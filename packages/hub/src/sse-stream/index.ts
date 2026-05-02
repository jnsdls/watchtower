import type { HubDatabase } from "../db/client";
import { listEventsAfterSequence } from "../db/queries";

type StreamEvent = Awaited<ReturnType<typeof listEventsAfterSequence>>[number];
type EventListener = (events: StreamEvent[]) => void;

export const sseHeaders = new Headers({
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "Content-Type": "text/event-stream; charset=utf-8",
});

export const createEventBroadcaster = () => {
  const listeners = new Set<EventListener>();

  return {
    publish(events: StreamEvent[]) {
      if (events.length === 0) {
        return;
      }

      for (const listener of listeners) {
        listener(events);
      }
    },
    subscribe(listener: EventListener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
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

  const close = () => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    unsubscribe?.();
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

        const backfillEvents = await listEventsAfterSequence(
          db,
          parseLastEventId(lastEventId),
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
