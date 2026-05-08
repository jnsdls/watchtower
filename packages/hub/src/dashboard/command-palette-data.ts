export type CommandPaletteProject = {
  id: string;
  gitRemoteUrl: string | null;
  localPath: string | null;
  displayName: string;
  createdAt: string;
};

export type CommandPaletteJob = {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  title: string | null;
};

export type CommandPaletteTask = {
  id: string;
  jobId: string;
  externalId: string;
  title: string;
  branch: string | null;
  status: string;
  failureCount: number;
  createdAt: string;
};

export type CommandPaletteRun = {
  id: string;
  jobId: string;
  taskId: string | null;
  name: string;
  agentProvider: string;
  agentModel: string | null;
  sandboxProvider: string;
  branch: string | null;
  maxIterations: number | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  cancelRequested: boolean;
  completionSignal: string | null;
  configSnapshot: Record<string, unknown>;
  errorMessage: string | null;
};

export type CommandPaletteSnapshot = {
  projects: CommandPaletteProject[];
  jobs: CommandPaletteJob[];
  runs: CommandPaletteRun[];
  tasks: CommandPaletteTask[];
};

export type CommandPaletteItem = {
  id: string;
  href?: string;
  icon: "tool" | "layers" | "folder" | "cancel";
  status?: string;
  text: string;
  meta?: string;
  shortcut?: string[];
  jobId?: string;
  action?: "cancel-job";
};

export type CommandPaletteModel = {
  actionItems: CommandPaletteItem[];
  goItems: CommandPaletteItem[];
  jobItems: CommandPaletteItem[];
  runItems: CommandPaletteItem[];
  runMatchCount: number;
  totalRunCount: number;
};

const MAX_GROUP_ITEMS = 10;

const fallbackJobTitle = (job: CommandPaletteJob) =>
  job.title ?? `Job j_${job.id.slice(0, 6)}`;

const includesQuery = (value: string | null | undefined, query: string) =>
  query.length === 0 || (value ?? "").toLowerCase().includes(query);

const latestActivity = (startedAt: string, endedAt: string | null) =>
  new Date(endedAt ?? startedAt).getTime();

const formatElapsed = (
  startedAt: string,
  endedAt: string | null,
  now: Date,
) => {
  if (!endedAt) {
    const seconds = Math.max(
      0,
      Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000),
    );
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
      2,
      "0",
    )}`;
  }

  const seconds = Math.max(
    0,
    Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    ),
  );
  const minutes = Math.floor(seconds / 60);

  if (minutes < 1) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds % 60}s`;
};

const pathnameJobId = (
  pathname: string,
  runsById: Map<string, CommandPaletteRun>,
) => {
  const jobMatch = /^\/jobs\/([^/]+)/.exec(pathname);

  if (jobMatch?.[1]) {
    return jobMatch[1];
  }

  const runMatch = /^\/runs\/([^/]+)/.exec(pathname);
  const run = runMatch?.[1] ? runsById.get(runMatch[1]) : null;
  return run?.jobId ?? null;
};

export const getNextCommandPaletteIndex = (
  currentIndex: number,
  itemCount: number,
  direction: 1 | -1,
) => {
  if (itemCount === 0) {
    return -1;
  }

  if (currentIndex < 0) {
    return direction === 1 ? 0 : itemCount - 1;
  }

  return (currentIndex + direction + itemCount) % itemCount;
};

export const buildCommandPaletteModel = (
  snapshot: CommandPaletteSnapshot,
  {
    now = new Date(),
    pathname,
    query,
  }: {
    now?: Date;
    pathname: string;
    query: string;
  },
): CommandPaletteModel => {
  const normalizedQuery = query.trim().toLowerCase();
  const projectsById = new Map(
    snapshot.projects.map((project) => [project.id, project]),
  );
  const jobsById = new Map(snapshot.jobs.map((job) => [job.id, job]));
  const runsById = new Map(snapshot.runs.map((run) => [run.id, run]));
  const tasksById = new Map(snapshot.tasks.map((task) => [task.id, task]));
  const tasksByJobId = new Map<string, CommandPaletteTask[]>();

  for (const task of snapshot.tasks) {
    tasksByJobId.set(task.jobId, [
      ...(tasksByJobId.get(task.jobId) ?? []),
      task,
    ]);
  }

  const runMatches = snapshot.runs.filter((run) => {
    const job = jobsById.get(run.jobId);
    const task = run.taskId ? tasksById.get(run.taskId) : null;

    return [
      run.branch,
      task?.branch,
      job ? fallbackJobTitle(job) : null,
      run.name,
      task?.title,
    ].some((value) => includesQuery(value, normalizedQuery));
  });

  const runItems = runMatches
    .sort(
      (left, right) =>
        latestActivity(right.startedAt, right.endedAt) -
        latestActivity(left.startedAt, left.endedAt),
    )
    .slice(0, MAX_GROUP_ITEMS)
    .map<CommandPaletteItem>((run) => {
      const job = jobsById.get(run.jobId);
      const project = job ? projectsById.get(job.projectId) : null;
      const task = run.taskId ? tasksById.get(run.taskId) : null;
      const detail = task?.title ?? run.name;

      return {
        id: run.id,
        href: `/runs/${run.id}`,
        icon: "tool",
        status: run.status,
        text: `${run.name} · ${detail}`,
        meta: `${project?.displayName ?? "Unknown Project"} · ${formatElapsed(
          run.startedAt,
          run.endedAt,
          now,
        )}`,
      };
    });

  const jobMatches = snapshot.jobs.filter((job) => {
    const jobTasks = tasksByJobId.get(job.id) ?? [];
    const jobRuns = snapshot.runs.filter((run) => run.jobId === job.id);

    return [
      fallbackJobTitle(job),
      ...jobTasks.flatMap((task) => [task.title, task.branch]),
      ...jobRuns.flatMap((run) => [run.name, run.branch]),
    ].some((value) => includesQuery(value, normalizedQuery));
  });

  const jobItems = jobMatches
    .sort(
      (left, right) =>
        latestActivity(right.startedAt, right.endedAt) -
        latestActivity(left.startedAt, left.endedAt),
    )
    .slice(0, MAX_GROUP_ITEMS)
    .map<CommandPaletteItem>((job) => {
      const project = projectsById.get(job.projectId);

      return {
        id: job.id,
        href: `/jobs/${job.id}`,
        icon: "layers",
        status: job.status,
        text: fallbackJobTitle(job),
        meta: `${project?.displayName ?? "Unknown Project"} · ${formatElapsed(
          job.startedAt,
          job.endedAt,
          now,
        )}`,
      };
    });

  const currentJobId = pathnameJobId(pathname, runsById);
  const currentJobHasRunningRun =
    !!currentJobId &&
    snapshot.runs.some(
      (run) => run.jobId === currentJobId && run.status === "running",
    );
  const cancelMatches = includesQuery("Cancel running Job", normalizedQuery);
  const actionItems =
    currentJobId && currentJobHasRunningRun && cancelMatches
      ? [
          {
            id: `cancel-${currentJobId}`,
            action: "cancel-job" as const,
            icon: "cancel" as const,
            jobId: currentJobId,
            shortcut: ["⌘", "."],
            text: "Cancel running Job",
          },
        ]
      : [];

  const goItems = includesQuery("Projects", normalizedQuery)
    ? [
        {
          id: "projects",
          href: "/",
          icon: "folder" as const,
          shortcut: ["G", "P"],
          text: "Projects",
        },
      ]
    : [];

  return {
    actionItems,
    goItems,
    jobItems,
    runItems,
    runMatchCount: runMatches.length,
    totalRunCount: snapshot.runs.length,
  };
};
