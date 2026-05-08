import {
  and,
  desc,
  eq,
  gt,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { costForRun } from "../pricing/rates";
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

const millisecondsOrZero = (date: Date | null) => date?.getTime() ?? 0;

const maxDate = (...dates: (Date | null)[]) =>
  dates.reduce<Date | null>((latest, date) => {
    if (!date) {
      return latest;
    }

    if (!latest || date > latest) {
      return date;
    }

    return latest;
  }, null);

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

export const findOrCreateProject = async (
  db: HubQueryDatabase,
  input: {
    gitRemoteUrl?: string | null;
    localPath?: string | null;
    displayName: string;
  },
) => {
  if (input.gitRemoteUrl) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.gitRemoteUrl, input.gitRemoteUrl),
    });

    if (project) {
      return project;
    }
  }

  if (input.localPath) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.localPath, input.localPath),
    });

    if (project) {
      return project;
    }
  }

  return createProject(db, input);
};

export const listProjectsByRecentActivity = async (db: HubQueryDatabase) => {
  const projectRows = await db.select().from(projects);
  const jobRows = await db.select().from(jobs);
  const runRows = await db.select().from(runs);

  return projectRows
    .map((project) => {
      const projectJobs = jobRows.filter((job) => job.projectId === project.id);
      const projectJobIds = new Set(projectJobs.map((job) => job.id));
      const projectRuns = runRows.filter((run) => projectJobIds.has(run.jobId));
      const latestActivityAt =
        maxDate(
          project.createdAt,
          ...projectJobs.map((job) => maxDate(job.startedAt, job.endedAt)),
          ...projectRuns.map((run) => maxDate(run.startedAt, run.endedAt)),
        ) ?? project.createdAt;

      return {
        ...project,
        latestActivityAt,
        jobCount: projectJobs.length,
        runCount: projectRuns.length,
        runningCount: projectRuns.filter((run) => run.status === "running")
          .length,
      };
    })
    .sort(
      (left, right) =>
        millisecondsOrZero(right.latestActivityAt) -
        millisecondsOrZero(left.latestActivityAt),
    );
};

export const createJob = async (
  db: HubQueryDatabase,
  input: {
    id?: string;
    projectId: string;
    startedAt: Date;
    endedAt?: Date | null;
    status: string;
    processPid?: number | null;
    title?: string | null;
    template?: string | null;
    watchtowerVersion?: string | null;
  },
) => {
  const [job] = await db.insert(jobs).values(input).returning();
  return requireRow(job, "Job");
};

export const getJob = async (db: HubQueryDatabase, id: string) =>
  db.query.jobs.findFirst({ where: eq(jobs.id, id) });

export const updateJobComplete = async (
  db: HubQueryDatabase,
  input: { id: string; endedAt: Date; status: string },
) => {
  const [job] = await db
    .update(jobs)
    .set({
      endedAt: input.endedAt,
      status: input.status,
    })
    .where(eq(jobs.id, input.id))
    .returning();

  return requireRow(job, "Job");
};

export const listJobsForProjectSummary = async (
  db: HubQueryDatabase,
  projectId: string,
) => {
  const rows = await db
    .select({
      id: jobs.id,
      projectId: jobs.projectId,
      startedAt: jobs.startedAt,
      endedAt: jobs.endedAt,
      status: jobs.status,
      processPid: jobs.processPid,
      title: jobs.title,
      template: jobs.template,
      watchtowerVersion: jobs.watchtowerVersion,
      runCount: sql<number>`count(distinct ${runs.id})::int`,
      totalTokens: sql<
        number | null
      >`nullif(coalesce(sum(${iterations.inputTokens}), 0) + coalesce(sum(${iterations.outputTokens}), 0) + coalesce(sum(${iterations.cacheReadInputTokens}), 0) + coalesce(sum(${iterations.cacheCreationInputTokens}), 0), 0)::int`,
      branch: sql<string | null>`max(${runs.branch})`,
      agentProvider: sql<
        string | null
      >`coalesce(max(case when ${runs.agentProvider} = 'codex' then 'codex' else null end), min(${runs.agentProvider}))`,
    })
    .from(jobs)
    .leftJoin(runs, eq(runs.jobId, jobs.id))
    .leftJoin(iterations, eq(iterations.runId, runs.id))
    .where(eq(jobs.projectId, projectId))
    .groupBy(jobs.id)
    .orderBy(desc(jobs.startedAt));

  return rows;
};

export const getProjectDashboardMetrics = async (
  db: HubQueryDatabase,
  projectId: string,
  now = new Date(),
) => {
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [jobWindowRow] = await db
    .select({
      jobs24h: sql<number>`count(*) filter (where ${jobs.startedAt} >= ${since24h})::int`,
      jobsPrevious24h: sql<number>`count(*) filter (where ${jobs.startedAt} >= ${since48h} and ${jobs.startedAt} < ${since24h})::int`,
    })
    .from(jobs)
    .where(and(eq(jobs.projectId, projectId), gte(jobs.startedAt, since48h)));

  const [activeRunRow] = await db
    .select({
      activeRuns: sql<number>`count(${runs.id})::int`,
      activeRunJobs: sql<number>`count(distinct ${runs.jobId})::int`,
    })
    .from(jobs)
    .leftJoin(runs, and(eq(runs.jobId, jobs.id), eq(runs.status, "running")))
    .where(eq(jobs.projectId, projectId));

  const [successRow] = await db
    .select({
      completedJobs: sql<number>`count(*) filter (where ${jobs.status} in ('succeeded', 'completed', 'failed', 'canceled'))::int`,
      succeededJobs: sql<number>`count(*) filter (where ${jobs.status} in ('succeeded', 'completed'))::int`,
    })
    .from(jobs)
    .where(and(eq(jobs.projectId, projectId), gte(jobs.startedAt, since30d)));

  const tokenRows = await db
    .select({
      runId: runs.id,
      agentProvider: runs.agentProvider,
      agentModel: runs.agentModel,
      inputTokens: sql<number | null>`sum(${iterations.inputTokens})::int`,
      outputTokens: sql<number | null>`sum(${iterations.outputTokens})::int`,
      cacheReadInputTokens: sql<
        number | null
      >`sum(${iterations.cacheReadInputTokens})::int`,
      cacheCreationInputTokens: sql<
        number | null
      >`sum(${iterations.cacheCreationInputTokens})::int`,
    })
    .from(jobs)
    .innerJoin(runs, eq(runs.jobId, jobs.id))
    .leftJoin(iterations, eq(iterations.runId, runs.id))
    .where(
      and(
        eq(jobs.projectId, projectId),
        gte(runs.startedAt, since24h),
        lt(runs.startedAt, now),
      ),
    )
    .groupBy(runs.id);

  const hasTokenData = (row: {
    inputTokens: number | null;
    outputTokens: number | null;
    cacheReadInputTokens: number | null;
    cacheCreationInputTokens: number | null;
  }) =>
    row.inputTokens !== null ||
    row.outputTokens !== null ||
    row.cacheReadInputTokens !== null ||
    row.cacheCreationInputTokens !== null;
  const tokens24h = tokenRows.reduce(
    (sum, row) =>
      sum +
      (row.inputTokens ?? 0) +
      (row.outputTokens ?? 0) +
      (row.cacheReadInputTokens ?? 0) +
      (row.cacheCreationInputTokens ?? 0),
    0,
  );
  const costValues = tokenRows
    .map((row) => costForRun(row, hasTokenData(row) ? [row] : []))
    .filter((value): value is number => value !== null);
  const completedJobs = successRow?.completedJobs ?? 0;
  const succeededJobs = successRow?.succeededJobs ?? 0;

  return {
    jobs24h: jobWindowRow?.jobs24h ?? 0,
    jobsPrevious24h: jobWindowRow?.jobsPrevious24h ?? 0,
    activeRuns: activeRunRow?.activeRuns ?? 0,
    activeRunJobs: activeRunRow?.activeRunJobs ?? 0,
    tokens24h: tokens24h === 0 ? null : tokens24h,
    cost24h:
      costValues.length === 0
        ? null
        : costValues.reduce((sum, value) => sum + value, 0),
    successRate30d:
      completedJobs === 0
        ? null
        : Math.round((succeededJobs / completedJobs) * 100),
  };
};

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

export const findTaskForJobByExternalId = async (
  db: HubQueryDatabase,
  jobId: string,
  externalId: string,
) =>
  db.query.tasks.findFirst({
    where: and(eq(tasks.jobId, jobId), eq(tasks.externalId, externalId)),
  });

export const findTaskForJobByBranch = async (
  db: HubQueryDatabase,
  jobId: string,
  branch: string,
) =>
  db.query.tasks.findFirst({
    where: and(eq(tasks.jobId, jobId), eq(tasks.branch, branch)),
  });

export const listTasksForJob = async (db: HubQueryDatabase, jobId: string) =>
  db
    .select()
    .from(tasks)
    .where(eq(tasks.jobId, jobId))
    .orderBy(tasks.externalId);

export const updateTaskStatus = async (
  db: HubQueryDatabase,
  input: { id: string; status: string },
) => {
  await db
    .update(tasks)
    .set({ status: input.status })
    .where(eq(tasks.id, input.id));
};

export const incrementTaskFailureCount = async (
  db: HubQueryDatabase,
  taskId: string,
) => {
  await db
    .update(tasks)
    .set({ failureCount: sql`${tasks.failureCount} + 1` })
    .where(eq(tasks.id, taskId));
};

export const listOrphanRunsWithBranch = async (db: HubQueryDatabase) =>
  db
    .select()
    .from(runs)
    .where(and(isNull(runs.taskId), isNotNull(runs.branch)));

export const setRunTaskId = async (
  db: HubQueryDatabase,
  input: { runId: string; taskId: string },
) => {
  await db
    .update(runs)
    .set({ taskId: input.taskId })
    .where(eq(runs.id, input.runId));
};

export const listRunsForTask = async (db: HubQueryDatabase, taskId: string) =>
  db.select().from(runs).where(eq(runs.taskId, taskId)).orderBy(runs.startedAt);

export const createRun = async (
  db: HubQueryDatabase,
  input: {
    id?: string;
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

export const updateRunTelemetryComplete = async (
  db: HubQueryDatabase,
  input: {
    id: string;
    endedAt: Date;
    status: string;
    branch?: string | null;
    completionSignal?: string | null;
    errorMessage?: string | null;
  },
) => {
  const [run] = await db
    .update(runs)
    .set({
      endedAt: input.endedAt,
      status: input.status,
      branch: input.branch ?? null,
      completionSignal: input.completionSignal ?? null,
      errorMessage: input.errorMessage ?? null,
    })
    .where(eq(runs.id, input.id))
    .returning();

  return requireRow(run, "Run");
};

export const requestRunCancel = async (
  db: HubQueryDatabase,
  input: { id: string; requestedAt: Date },
) => {
  const currentRun = await getRun(db, input.id);

  if (!currentRun) {
    return { status: "missing" as const, run: null, event: null };
  }

  if (currentRun.status !== "running") {
    return { status: "noop" as const, run: currentRun, event: null };
  }

  const [run] = await db
    .update(runs)
    .set({
      cancelRequested: true,
      endedAt: input.requestedAt,
      status: "canceled",
    })
    .where(eq(runs.id, input.id))
    .returning();

  const event = await createEvent(db, {
    runId: input.id,
    type: "status",
    payload: { status: "canceled", cancelRequested: true },
    timestamp: input.requestedAt,
  });

  return {
    status: "requested" as const,
    run: requireRow(run, "Run"),
    event,
  };
};

export const requestJobCancel = async (
  db: HubQueryDatabase,
  input: { id: string; requestedAt: Date },
) => {
  const job = await getJob(db, input.id);

  if (!job) {
    return {
      canceledCount: 0,
      events: [],
      runIds: [],
      status: "missing" as const,
    };
  }

  const jobRuns = await listRunsForJob(db, input.id);
  const runningRuns = jobRuns.filter((run) => run.status === "running");
  const results = await Promise.all(
    runningRuns.map((run) =>
      requestRunCancel(db, { id: run.id, requestedAt: input.requestedAt }),
    ),
  );
  const requested = results.filter(
    (result): result is Extract<typeof result, { status: "requested" }> =>
      result.status === "requested",
  );

  return {
    canceledCount: requested.length,
    events: requested.flatMap((result) => (result.event ? [result.event] : [])),
    runIds: requested.map((result) => result.run.id),
    status: "requested" as const,
  };
};

export const listRuns = async (db: HubQueryDatabase) =>
  db.select().from(runs).orderBy(desc(runs.startedAt));

export const listRunsForJob = async (db: HubQueryDatabase, jobId: string) =>
  db
    .select()
    .from(runs)
    .where(eq(runs.jobId, jobId))
    .orderBy(desc(runs.startedAt));

export const listCommandPaletteSnapshot = async (db: HubQueryDatabase) => {
  const [projectRows, jobRows, runRows, taskRows] = await Promise.all([
    db.select().from(projects),
    db.select().from(jobs),
    db.select().from(runs),
    db.select().from(tasks),
  ]);

  return {
    projects: projectRows,
    jobs: jobRows.sort(
      (left, right) =>
        millisecondsOrZero(right.endedAt ?? right.startedAt) -
        millisecondsOrZero(left.endedAt ?? left.startedAt),
    ),
    runs: runRows.sort(
      (left, right) =>
        millisecondsOrZero(right.endedAt ?? right.startedAt) -
        millisecondsOrZero(left.endedAt ?? left.startedAt),
    ),
    tasks: taskRows,
  };
};

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

export const listIterationsForRun = async (
  db: HubQueryDatabase,
  runId: string,
) =>
  db
    .select()
    .from(iterations)
    .where(eq(iterations.runId, runId))
    .orderBy(iterations.n);

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

export const listEventsAfterSequence = async (
  db: HubQueryDatabase,
  sequenceNumber: number,
) =>
  db
    .select()
    .from(events)
    .where(gt(events.sequenceNumber, sequenceNumber))
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
