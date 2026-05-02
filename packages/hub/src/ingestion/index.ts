import { z } from "zod";
import type { HubDatabase } from "../db/client";
import { createEvent } from "../db/queries";

const eventInputSchema = z.object({
  sequenceNumber: z.number().int().positive().optional(),
  runId: z.uuid(),
  iterationId: z.uuid().nullable().optional(),
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.coerce.date(),
});

const eventBatchSchema = z.union([
  z.array(eventInputSchema).min(1),
  z
    .object({ events: z.array(eventInputSchema).min(1) })
    .transform((value) => value.events),
]);

export type EventBatchInput = z.input<typeof eventBatchSchema>;
export type IngestedEvent = NonNullable<
  Awaited<ReturnType<typeof createEvent>>
>;

export class EventBatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventBatchValidationError";
  }
}

export const ingestEventBatch = async (
  db: HubDatabase,
  input: EventBatchInput,
): Promise<{ events: IngestedEvent[] }> => {
  const parsed = eventBatchSchema.safeParse(input);

  if (!parsed.success) {
    throw new EventBatchValidationError(z.prettifyError(parsed.error));
  }

  return db.transaction(async (tx) => {
    const ingestedEvents: IngestedEvent[] = [];

    for (const event of parsed.data) {
      const ingestedEvent = await createEvent(tx, {
        sequenceNumber: event.sequenceNumber,
        runId: event.runId,
        iterationId: event.iterationId ?? null,
        type: event.type,
        payload: event.payload,
        timestamp: event.timestamp,
      });

      if (ingestedEvent) {
        ingestedEvents.push(ingestedEvent);
      }
    }

    return { events: ingestedEvents };
  });
};
