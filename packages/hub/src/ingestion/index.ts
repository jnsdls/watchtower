import { z } from "zod";
import type { HubDatabase } from "../db/client";
import {
  createCommit,
  createEvent,
  createIteration,
  createJob,
  createRun,
  findOrCreateProject,
  updateJobComplete,
  updateRunTelemetryComplete,
} from "../db/queries";

const eventInputSchema = z.object({
  sequenceNumber: z.number().int().positive().optional(),
  runId: z.uuid(),
  iterationId: z.uuid().nullable().optional(),
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.coerce.date(),
});

const jobStartedEventSchema = z.object({
  type: z.literal("job.started"),
  jobId: z.uuid(),
  project: z.object({
    gitRemoteUrl: z.string().nullable().optional(),
    localPath: z.string().nullable().optional(),
    displayName: z.string().min(1),
  }),
  processPid: z.number().int().positive().nullable().optional(),
  watchtowerVersion: z.string().nullable().optional(),
  timestamp: z.coerce.date(),
});

const jobCompletedEventSchema = z.object({
  type: z.literal("job.completed"),
  jobId: z.uuid(),
  status: z.string().min(1),
  timestamp: z.coerce.date(),
});

const runStartedEventSchema = z.object({
  type: z.literal("run.started"),
  runId: z.uuid(),
  jobId: z.uuid(),
  name: z.string().min(1),
  agentProvider: z.string().min(1),
  agentModel: z.string().nullable().optional(),
  sandboxProvider: z.string().min(1),
  branch: z.string().nullable().optional(),
  maxIterations: z.number().int().positive().nullable().optional(),
  configSnapshot: z.record(z.string(), z.unknown()),
  timestamp: z.coerce.date(),
});

const runEventSchema = z.object({
  type: z.literal("run.event"),
  runId: z.uuid(),
  eventType: z.string().min(1),
  iteration: z.number().int().positive().nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.coerce.date(),
});

const runCompletedEventSchema = z.object({
  type: z.literal("run.completed"),
  runId: z.uuid(),
  status: z.string().min(1),
  branch: z.string().nullable().optional(),
  completionSignal: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  iterations: z
    .array(
      z.object({
        n: z.number().int().positive(),
        inputTokens: z.number().int().nullable().optional(),
        outputTokens: z.number().int().nullable().optional(),
        cacheReadInputTokens: z.number().int().nullable().optional(),
        cacheCreationInputTokens: z.number().int().nullable().optional(),
        sessionId: z.string().nullable().optional(),
        sessionFilePath: z.string().nullable().optional(),
      }),
    )
    .optional(),
  commits: z.array(z.object({ sha: z.string().min(1) })).optional(),
  timestamp: z.coerce.date(),
});

const telemetryEventSchema = z.discriminatedUnion("type", [
  jobStartedEventSchema,
  jobCompletedEventSchema,
  runStartedEventSchema,
  runEventSchema,
  runCompletedEventSchema,
]);

const eventBatchSchema = z.union([
  z.array(z.union([telemetryEventSchema, eventInputSchema])).min(1),
  z
    .object({
      events: z.array(z.union([telemetryEventSchema, eventInputSchema])).min(1),
    })
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
      if (event.type === "job.started" && "project" in event) {
        const project = await findOrCreateProject(tx, {
          gitRemoteUrl: event.project.gitRemoteUrl ?? null,
          localPath: event.project.localPath ?? null,
          displayName: event.project.displayName,
        });
        await createJob(tx, {
          id: event.jobId,
          projectId: project.id,
          startedAt: event.timestamp,
          status: "running",
          processPid: event.processPid ?? null,
          watchtowerVersion: event.watchtowerVersion ?? null,
        });
        continue;
      }

      if (event.type === "job.completed" && "jobId" in event) {
        await updateJobComplete(tx, {
          id: event.jobId,
          endedAt: event.timestamp,
          status: event.status,
        });
        continue;
      }

      if (event.type === "run.started" && "agentProvider" in event) {
        await createRun(tx, {
          id: event.runId,
          jobId: event.jobId,
          name: event.name,
          agentProvider: event.agentProvider,
          agentModel: event.agentModel ?? null,
          sandboxProvider: event.sandboxProvider,
          branch: event.branch ?? null,
          maxIterations: event.maxIterations ?? null,
          startedAt: event.timestamp,
          status: "running",
          configSnapshot: event.configSnapshot,
        });
        continue;
      }

      if (event.type === "run.completed" && "status" in event) {
        await updateRunTelemetryComplete(tx, {
          id: event.runId,
          endedAt: event.timestamp,
          status: event.status,
          branch: event.branch ?? null,
          completionSignal: event.completionSignal ?? null,
          errorMessage: event.errorMessage ?? null,
        });

        for (const iteration of event.iterations ?? []) {
          await createIteration(tx, {
            runId: event.runId,
            n: iteration.n,
            startedAt: event.timestamp,
            endedAt: event.timestamp,
            inputTokens: iteration.inputTokens ?? null,
            outputTokens: iteration.outputTokens ?? null,
            cacheReadInputTokens: iteration.cacheReadInputTokens ?? null,
            cacheCreationInputTokens:
              iteration.cacheCreationInputTokens ?? null,
            sessionId: iteration.sessionId ?? null,
            sessionFilePath: iteration.sessionFilePath ?? null,
          });
        }

        for (const commit of event.commits ?? []) {
          await createCommit(tx, {
            runId: event.runId,
            sha: commit.sha,
          });
        }
        continue;
      }

      const ingestedEvent =
        event.type === "run.event" && "eventType" in event
          ? await createEvent(tx, {
              runId: event.runId,
              type: event.eventType,
              payload: event.payload,
              timestamp: event.timestamp,
            })
          : "payload" in event
            ? await createEvent(tx, {
                sequenceNumber: (event as z.infer<typeof eventInputSchema>)
                  .sequenceNumber,
                runId: event.runId,
                iterationId:
                  (event as z.infer<typeof eventInputSchema>).iterationId ??
                  null,
                type: event.type,
                payload: event.payload,
                timestamp: event.timestamp,
              })
            : null;

      if (ingestedEvent) {
        ingestedEvents.push(ingestedEvent);
      }
    }

    return { events: ingestedEvents };
  });
};
