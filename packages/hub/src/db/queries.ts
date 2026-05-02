import { desc, eq } from "drizzle-orm";
import type { HubQueryDatabase } from "./client";
import {
  commits,
  events,
  iterations,
  jobs,
  projects,
  runs,
  tasks,
} from "./schema";

export type JsonRecord = Record<string, unknown>;

const requireRow = <T>(row: T | undefined, entityName: string) => {
  if (!row) {
    throw new Error(`Expected ${entityName} insert to return a row`);
  }

  return row;
};

export const createProject = async (
  db: HubQueryDatabase,
  input: {
    gitRemoteUrl?: string | null;
    localPath?: string | null;
    displayName: string;
  },
) => {
  const [project] = await db
    .insert(projects)
    .values({
      displayName: input.displayName,
      gitRemoteUrl: input.gitRemoteUrl ?? null,
      localPath: input.localPath ?? null,
    })
    .returning();

  return requireRow(project, "Project");
};

export const getProject = async (db: HubQueryDatabase, id: string) =>
  db.query.projects.findFirst({ where: eq(projects.id, id) });

export const createJob = async (
  db: HubQueryDatabase,
  input: {
    projectId: string;
    startedAt: Date;
    endedAt?: Date | null;
    status: string;
    processPid?: number | null;
    watchtowerVersion?: string | null;
  },
) => {
  const [job] = await db.insert(jobs).values(input).returning();
  return requireRow(job, "Job");
};

export const getJob = async (db: HubQueryDatabase, id: string) =>
  db.query.jobs.findFirst({ where: eq(jobs.id, id) });

export const createTask = async (
  db: HubQueryDatabase,
  input: {
    jobId: string;
    externalId: string;
    title: string;
    branch?: string | null;
    status: string;
  },
) => {
  const [task] = await db.insert(tasks).values(input).returning();
  return requireRow(task, "Task");
};

export const getTask = async (db: HubQueryDatabase, id: string) =>
  db.query.tasks.findFirst({ where: eq(tasks.id, id) });

export const createRun = async (
  db: HubQueryDatabase,
  input: {
    jobId: string;
    taskId?: string | null;
    name: string;
    agentProvider: string;
    agentModel?: string | null;
    sandboxProvider: string;
    branch?: string | null;
    maxIterations?: number | null;
    startedAt: Date;
    endedAt?: Date | null;
    status: string;
    completionSignal?: string | null;
    configSnapshot: JsonRecord;
    errorMessage?: string | null;
  },
) => {
  const [run] = await db.insert(runs).values(input).returning();
  return requireRow(run, "Run");
};

export const getRun = async (db: HubQueryDatabase, id: string) =>
  db.query.runs.findFirst({ where: eq(runs.id, id) });

export const listRuns = async (db: HubQueryDatabase) =>
  db.select().from(runs).orderBy(desc(runs.startedAt));

export const createIteration = async (
  db: HubQueryDatabase,
  input: {
    runId: string;
    n: number;
    startedAt: Date;
    endedAt?: Date | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cacheReadInputTokens?: number | null;
    cacheCreationInputTokens?: number | null;
    sessionId?: string | null;
    sessionFilePath?: string | null;
  },
) => {
  const [iteration] = await db.insert(iterations).values(input).returning();
  return requireRow(iteration, "Iteration");
};

export const getIteration = async (db: HubQueryDatabase, id: string) =>
  db.query.iterations.findFirst({ where: eq(iterations.id, id) });

export const createEvent = async (
  db: HubQueryDatabase,
  input: {
    sequenceNumber?: number;
    runId: string;
    iterationId?: string | null;
    type: string;
    payload: JsonRecord;
    timestamp: Date;
  },
) => {
  const [event] = await db
    .insert(events)
    .values(input)
    .onConflictDoNothing({ target: events.sequenceNumber })
    .returning();

  return event ?? null;
};

export const listEventsForRun = async (db: HubQueryDatabase, runId: string) =>
  db
    .select()
    .from(events)
    .where(eq(events.runId, runId))
    .orderBy(events.sequenceNumber);

export const createCommit = async (
  db: HubQueryDatabase,
  input: { runId: string; sha: string },
) => {
  const [commit] = await db.insert(commits).values(input).returning();
  return requireRow(commit, "Commit");
};

export const getCommit = async (db: HubQueryDatabase, id: string) =>
  db.query.commits.findFirst({ where: eq(commits.id, id) });
