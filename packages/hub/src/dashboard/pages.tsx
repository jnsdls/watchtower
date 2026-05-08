import {
  ChevronRight,
  Clock,
  Copy,
  GitBranch,
  GitCompareArrows,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "../components/ui/button";
import type {
  getJob,
  getProject,
  getRun,
  listEventsForRun,
  listIterationsForRun,
  listJobsForProjectSummary,
  listProjectsByRecentActivity,
  listRunsForJob,
  listTasksForJob,
} from "../db/queries";
import { CancelJobButton } from "./cancel-job-button";
import { CancelRunButton } from "./cancel-run-button";
import { formatDateTime, formatDuration, formatTokens } from "./format";
import {
  LiveDuration,
  Mono,
  Num,
  StatusPill,
  type StatusPillStatus,
} from "./primitives";

type ProjectListItem = Awaited<
  ReturnType<typeof listProjectsByRecentActivity>
>[number];
type Project = NonNullable<Awaited<ReturnType<typeof getProject>>>;
type Job = NonNullable<Awaited<ReturnType<typeof getJob>>>;
type Run = NonNullable<Awaited<ReturnType<typeof getRun>>>;
type JobSummary = Awaited<ReturnType<typeof listJobsForProjectSummary>>[number];
type RunListItem = Awaited<ReturnType<typeof listRunsForJob>>[number];
type TaskListItem = Awaited<ReturnType<typeof listTasksForJob>>[number];
type EventListItem = Awaited<ReturnType<typeof listEventsForRun>>[number];
type IterationListItem = Awaited<
  ReturnType<typeof listIterationsForRun>
>[number];

const PageShell = ({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) => (
  <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
    <header className="flex flex-col gap-2 border-border border-b pb-4">
      <p className="font-medium text-muted text-sm">{eyebrow}</p>
      <h1 className="font-semibold text-3xl text-fg">{title}</h1>
    </header>
    {children}
  </main>
);

const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-md border border-border bg-card p-6 text-muted">
    {children}
  </div>
);

const statusPillValue = (value: string): StatusPillStatus | null => {
  switch (value) {
    case "running":
      return "running";
    case "succeeded":
    case "completed":
      return "succeeded";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return null;
  }
};

const Status = ({ value }: { value: string }) => {
  const status = statusPillValue(value);

  if (status) {
    return <StatusPill status={status}>{value}</StatusPill>;
  }

  return (
    <span className="inline-flex h-5 items-center rounded-full border border-border bg-card-soft px-2 font-medium text-[11px] text-fg">
      {value}
    </span>
  );
};

const formatJobTitle = (job: { id: string; title: string | null }) =>
  job.title ?? `Job j_${job.id.slice(0, 6)}`;

const maxDate = (...dates: (Date | null | undefined)[]) =>
  dates.reduce<Date | null>((latest, date) => {
    if (!date) {
      return latest;
    }

    if (!latest || date > latest) {
      return date;
    }

    return latest;
  }, null);

const statusBarClass = (status: string) => {
  switch (status) {
    case "running":
      return "border-st-running-bd bg-st-running-bg text-fg wt-running-stripe";
    case "succeeded":
    case "completed":
      return "border-st-succeeded-bd bg-st-succeeded-bg text-fg";
    case "failed":
      return "border-st-failed-bd bg-st-failed-bg text-fg";
    case "canceled":
      return "border-st-canceled-bd bg-st-canceled-bg text-fg";
    default:
      return "border-border bg-card-soft text-fg";
  }
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const percentBetween = (date: Date, start: Date, spanMs: number) =>
  clampPercent(((date.getTime() - start.getTime()) / spanMs) * 100);

const fallbackTimelineEnd = (start: Date) => new Date(start.getTime() + 60_000);

type GanttBar = RunListItem & {
  track: number;
};

type GanttMode = "task" | "runName" | "flat";

type GanttLane = {
  id: string;
  label: string;
  detail: string | null;
  runs: GanttBar[];
  kind: "framework" | "task" | "runName" | "flat";
};

const assignTracks = (runs: RunListItem[], timelineEnd: Date): GanttBar[] => {
  const trackEnds: Date[] = [];

  return [...runs]
    .sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime())
    .map((run) => {
      const runEnd = run.endedAt ?? timelineEnd;
      const track = trackEnds.findIndex((end) => end <= run.startedAt);
      const assignedTrack = track === -1 ? trackEnds.length : track;
      trackEnds[assignedTrack] = runEnd;

      return {
        ...run,
        track: assignedTrack,
      };
    });
};

const buildGanttLanes = ({
  runs,
  tasks,
  timelineEnd,
  mode,
}: {
  runs: RunListItem[];
  tasks: TaskListItem[];
  timelineEnd: Date;
  mode: GanttMode;
}) => {
  if (mode === "flat") {
    return {
      modeLabel: "Flat",
      lanes: [
        {
          id: "flat",
          label: "All Runs",
          detail: null,
          kind: "flat" as const,
          runs: assignTracks(runs, timelineEnd),
        },
      ],
    };
  }

  if (mode === "task" && tasks.length > 0) {
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    const taskLanes = tasks.map<GanttLane>((task) => ({
      id: task.id,
      label: task.title,
      detail: task.branch ?? task.externalId,
      kind: "task",
      runs: assignTracks(
        runs.filter((run) => run.taskId === task.id),
        timelineEnd,
      ),
    }));
    const frameworkLanes = runs
      .filter((run) => run.taskId === null || !tasksById.has(run.taskId))
      .map<GanttLane>((run) => ({
        id: run.id,
        label: run.name,
        detail: null,
        kind: "framework",
        runs: assignTracks([run], timelineEnd),
      }));

    return {
      modeLabel: "Task lanes",
      lanes: [...taskLanes, ...frameworkLanes].sort((left, right) => {
        const leftStart = Math.min(
          ...left.runs.map((run) => run.startedAt.getTime()),
        );
        const rightStart = Math.min(
          ...right.runs.map((run) => run.startedAt.getTime()),
        );
        return leftStart - rightStart;
      }),
    };
  }

  const runNames = [...new Set(runs.map((run) => run.name))].sort((a, b) => {
    const firstA = Math.min(
      ...runs
        .filter((run) => run.name === a)
        .map((run) => run.startedAt.getTime()),
    );
    const firstB = Math.min(
      ...runs
        .filter((run) => run.name === b)
        .map((run) => run.startedAt.getTime()),
    );
    return firstA - firstB;
  });

  return {
    modeLabel: "Run name",
    lanes: runNames.map<GanttLane>((name) => ({
      id: name,
      label: name,
      detail: null,
      kind: "runName",
      runs: assignTracks(
        runs.filter((run) => run.name === name),
        timelineEnd,
      ),
    })),
  };
};

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(date);

const parseGanttMode = (
  value: string | null | undefined,
  tasks: TaskListItem[],
): GanttMode => {
  if (value === "task" && tasks.length > 0) {
    return "task";
  }

  if (value === "runName" || value === "flat") {
    return value;
  }

  return tasks.length > 0 ? "task" : "runName";
};

const taskLabelForRun = (
  run: RunListItem,
  tasksById: Map<string, TaskListItem>,
) => {
  if (!run.taskId) {
    return "—";
  }

  const task = tasksById.get(run.taskId);
  return task ? `#${task.externalId}` : "—";
};

const JobGantt = ({
  job,
  mode,
  runs,
  tasks,
}: {
  job: Job;
  mode: GanttMode;
  runs: RunListItem[];
  tasks: TaskListItem[];
}) => {
  const observedEnd = maxDate(
    job.endedAt,
    ...runs.map((run) => run.endedAt),
    runs.some((run) => run.endedAt === null) ? new Date() : null,
  );
  const timelineEnd =
    observedEnd && observedEnd > job.startedAt
      ? observedEnd
      : fallbackTimelineEnd(job.startedAt);
  const spanMs = timelineEnd.getTime() - job.startedAt.getTime();
  const { lanes, modeLabel } = buildGanttLanes({
    runs,
    tasks,
    timelineEnd,
    mode,
  });
  const ticks = Array.from({ length: 10 }, (_, index) => ({
    label:
      index === 9 && runs.some((run) => run.status === "running")
        ? "now"
        : formatTime(new Date(job.startedAt.getTime() + (spanMs / 9) * index)),
    left: (index / 9) * 100,
  }));

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-[13px] text-fg">Timeline</h2>
          <Mono className="text-[11px] text-muted">{modeLabel}</Mono>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-[5px] border border-border bg-card-soft p-0.5">
            {[
              ["task", "Task lanes"],
              ["runName", "Run name"],
              ["flat", "Flat"],
            ].map(([candidateMode, label]) => (
              <Link
                className={`rounded-[3px] px-2 py-0.5 text-[11px] ${
                  candidateMode === mode
                    ? "bg-hover text-fg"
                    : "text-muted hover:text-fg"
                }`}
                href={`?gantt=${candidateMode}`}
                key={candidateMode}
              >
                {label}
              </Link>
            ))}
          </div>
          <Mono className="text-[11px] text-muted">
            {runs.some((run) => run.status === "running")
              ? "now"
              : formatTime(timelineEnd)}
          </Mono>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[13rem_minmax(32rem,1fr)] border-border border-b bg-bg-elev text-muted text-[10px] uppercase">
            <div className="px-4 py-1.5 font-medium">Lane</div>
            <div className="relative h-6">
              {ticks.map((tick) => (
                <Mono
                  className={`absolute top-1.5 -translate-x-1/2 text-[10px] normal-case ${
                    tick.label === "now" ? "text-st-running" : "text-muted"
                  }`}
                  key={`${tick.left}-${tick.label}`}
                  style={{ left: `${tick.left}%` }}
                >
                  {tick.label}
                </Mono>
              ))}
            </div>
          </div>
          {lanes.map((lane) => {
            const trackCount = Math.max(
              1,
              ...lane.runs.map((run) => run.track + 1),
            );
            const laneHeight = trackCount * 42 + 24;

            return (
              <div
                className="grid grid-cols-[13rem_minmax(32rem,1fr)] border-border border-b last:border-b-0"
                key={lane.id}
              >
                <div className="flex min-h-11 flex-col justify-center px-4 py-2">
                  <Mono className="break-words font-medium text-fg text-xs">
                    {lane.label}
                  </Mono>
                  {lane.detail ? (
                    <Mono className="mt-1 break-words text-[11px] text-muted">
                      {lane.detail}
                    </Mono>
                  ) : null}
                </div>
                <div
                  className="relative border-border border-l bg-[repeating-linear-gradient(90deg,transparent_0_calc(11.111%-1px),var(--border)_calc(11.111%-1px)_11.111%)] px-4 py-3"
                  style={{ minHeight: laneHeight }}
                >
                  {lane.runs.length === 0 ? (
                    <div className="flex h-full items-center text-muted text-sm">
                      No Runs
                    </div>
                  ) : (
                    lane.runs.map((run) => {
                      const runEnd = run.endedAt ?? timelineEnd;
                      const left = percentBetween(
                        run.startedAt,
                        job.startedAt,
                        spanMs,
                      );
                      const right = percentBetween(
                        runEnd,
                        job.startedAt,
                        spanMs,
                      );
                      const width = Math.max(1, right - left);

                      return (
                        <Link
                          aria-label={`Open ${run.name} Run`}
                          className={`absolute flex h-6 items-center overflow-hidden rounded-[4px] border px-2 font-mono text-[11px] transition-colors ${statusBarClass(
                            run.status,
                          )}`}
                          href={`/runs/${run.id}`}
                          key={run.id}
                          style={{
                            left: `${left}%`,
                            top: 12 + run.track * 42,
                            width: `max(${width}%, 2.5rem)`,
                          }}
                          title={`${run.name} - ${run.status}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`absolute inset-0 ${
                              run.status === "running"
                                ? "bg-st-running"
                                : run.status === "failed"
                                  ? "bg-st-failed"
                                  : run.status === "canceled"
                                    ? "bg-st-canceled"
                                    : "bg-st-succeeded"
                            } opacity-30`}
                          />
                          <span className="truncate">
                            {run.name} · {run.status}
                          </span>
                          {run.status === "running" ? (
                            <span
                              aria-hidden="true"
                              className="absolute top-0 right-0 bottom-0 w-0.5 animate-wt-pulse bg-st-running"
                            />
                          ) : null}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export function ProjectListPage({ projects }: { projects: ProjectListItem[] }) {
  return (
    <PageShell eyebrow="Dashboard" title="Projects">
      {projects.length === 0 ? (
        <EmptyState>No Projects have reported Jobs yet.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-card-soft text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Latest activity</th>
                <th className="px-4 py-3 font-medium">Jobs</th>
                <th className="px-4 py-3 font-medium">Runs</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  className="relative border-border border-t transition-colors hover:bg-hover focus-within:bg-hover"
                  key={project.id}
                >
                  <td className="px-4 py-3">
                    <Link
                      aria-label={`Open ${project.displayName}`}
                      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      href={`/projects/${project.id}`}
                    />
                    <div className="font-medium text-fg">
                      {project.displayName}
                    </div>
                    <div className="text-muted">
                      {project.gitRemoteUrl ?? project.localPath ?? "n/a"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg">
                    {formatDateTime(project.latestActivityAt)}
                  </td>
                  <td className="px-4 py-3 text-fg">{project.jobCount}</td>
                  <td className="px-4 py-3 text-fg">{project.runCount}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight
                      aria-hidden="true"
                      className="ml-auto size-4 text-muted"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

export function ProjectDetailPage({
  project,
  jobs,
}: {
  project: Project;
  jobs: JobSummary[];
}) {
  return (
    <PageShell eyebrow="Project" title={project.displayName}>
      {jobs.length === 0 ? (
        <EmptyState>No Jobs have been captured for this Project.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-card-soft text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Runs</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const title = formatJobTitle(job);

                return (
                  <tr
                    className="relative border-border border-t transition-colors hover:bg-hover focus-within:bg-hover"
                    key={job.id}
                  >
                    <td className="px-4 py-3 font-medium text-fg">
                      <Link
                        aria-label={`Open ${title}`}
                        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        href={`/jobs/${job.id}`}
                      />
                      {title}
                    </td>
                    <td className="px-4 py-3 text-fg">
                      {formatDateTime(job.startedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Status value={job.status} />
                    </td>
                    <td className="px-4 py-3 text-fg">
                      {formatDuration(job.startedAt, job.endedAt)}
                    </td>
                    <td className="px-4 py-3 text-fg">{job.runCount}</td>
                    <td className="px-4 py-3 text-fg">
                      {formatTokens(job.totalTokens)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight
                        aria-hidden="true"
                        className="ml-auto size-4 text-muted"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

export function JobDetailPage({
  ganttMode,
  job,
  runs,
  tasks,
}: {
  ganttMode?: string | null;
  job: Job;
  runs: RunListItem[];
  tasks: TaskListItem[];
}) {
  const runsByTaskId = new Map<string, RunListItem[]>();
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  for (const run of runs) {
    if (!run.taskId) {
      continue;
    }

    const taskRuns = runsByTaskId.get(run.taskId) ?? [];
    taskRuns.push(run);
    runsByTaskId.set(run.taskId, taskRuns);
  }
  const displayBranch =
    runs.find((run) => run.branch)?.branch ??
    tasks.find((task) => task.branch)?.branch ??
    "main";
  const activeGanttMode = parseGanttMode(ganttMode, tasks);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-4">
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <Mono className="text-[11px] text-muted">
              JOB · j_{job.id.slice(0, 6)}
            </Mono>
            <Status value={job.status} />
            <Mono className="text-[11px] text-muted">
              {tasks.length} tasks · {runs.length} runs
            </Mono>
          </div>
          <h1 className="m-0 truncate font-semibold text-[20px] text-fg">
            {formatJobTitle(job)}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted text-xs">
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3.5" />
              Started {formatTime(job.startedAt)} ·{" "}
              {job.endedAt ? (
                formatDuration(job.startedAt, job.endedAt)
              ) : (
                <>
                  running <LiveDuration startedAt={job.startedAt} />
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch aria-hidden="true" className="size-3.5" />
              {displayBranch}
            </span>
            <span aria-hidden="true">·</span>
            <Mono>watchtower run main.ts</Mono>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" type="button" variant="ghost">
            <Copy aria-hidden="true" className="size-4" />
            Copy ID
          </Button>
          <Button size="sm" type="button" variant="ghost">
            <GitCompareArrows aria-hidden="true" className="size-4" />
            Compare
          </Button>
          {job.status === "running" ? <CancelJobButton jobId={job.id} /> : null}
        </div>
      </header>
      {runs.length > 0 ? (
        <JobGantt job={job} mode={activeGanttMode} runs={runs} tasks={tasks} />
      ) : null}
      {runs.length === 0 ? (
        <EmptyState>No Runs have been captured for this Job.</EmptyState>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center gap-2 border-border border-b px-4 py-2.5">
              <h2 className="font-medium text-[13px] text-fg">Tasks</h2>
              <Mono className="text-[11px] text-muted">
                {tasks.length} · from planner
              </Mono>
            </div>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-card-soft text-muted text-[11px] uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Branch</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Runs</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr className="h-[38px] border-border border-t" key={task.id}>
                    <td className="px-3 py-2">
                      <Mono className="text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </Mono>
                    </td>
                    <td className="px-3 py-2 font-medium text-fg">
                      {task.title}
                    </td>
                    <td className="px-3 py-2">
                      <Mono className="text-[11px] text-muted">
                        {task.branch ?? "—"}
                      </Mono>
                    </td>
                    <td className="px-3 py-2">
                      <Status value={task.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Num>{runsByTaskId.get(task.id)?.length ?? 0}</Num>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center gap-2 border-border border-b px-4 py-2.5">
              <h2 className="font-medium text-[13px] text-fg">Runs</h2>
              <Mono className="text-[11px] text-muted">{runs.length}</Mono>
            </div>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-card-soft text-muted text-[11px] uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Iters</th>
                  <th className="px-3 py-2 text-right font-medium">Dur</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    className="relative h-[38px] border-border border-t transition-colors hover:bg-hover focus-within:bg-hover"
                    key={run.id}
                  >
                    <td className="px-3 py-2">
                      <Link
                        aria-label={`Open ${run.name} Run`}
                        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        href={`/runs/${run.id}`}
                      />
                      <Mono className="inline-flex items-center gap-1.5 text-fg">
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-muted"
                        />
                        {run.name}
                      </Mono>
                    </td>
                    <td className="px-3 py-2">
                      <Mono className="text-[11px] text-muted">
                        {taskLabelForRun(run, tasksById)}
                      </Mono>
                    </td>
                    <td className="px-3 py-2">
                      <Status value={run.status} />
                    </td>
                    <td className="px-3 py-2">
                      <Num>{run.maxIterations ?? "—"}</Num>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Mono>{formatDuration(run.startedAt, run.endedAt)}</Mono>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </main>
  );
}

const eventBody = (event: EventListItem) => {
  if (event.type === "text") {
    const payload = event.payload as { message?: unknown; text?: unknown };
    return String(payload.message ?? payload.text ?? "");
  }

  if (event.type === "toolCall") {
    const payload = event.payload as {
      name?: unknown;
      formattedArgs?: unknown;
    };
    return `${String(payload.name ?? "tool")} ${String(
      payload.formattedArgs ?? "",
    )}`.trim();
  }

  return JSON.stringify(event.payload);
};

const tokenMetrics = [
  ["Input", "inputTokens"],
  ["Output", "outputTokens"],
  ["Cache read", "cacheReadInputTokens"],
  ["Cache creation", "cacheCreationInputTokens"],
] as const;

type TokenMetricKey = (typeof tokenMetrics)[number][1];

const sumNonNull = (values: (number | null)[]): number | null => {
  let total: number | null = null;
  for (const value of values) {
    if (value !== null) {
      total = (total ?? 0) + value;
    }
  }
  return total;
};

const sumIterationTokens = (
  iterations: IterationListItem[],
  metric: TokenMetricKey,
) => sumNonNull(iterations.map((iteration) => iteration[metric]));

const totalIterationTokens = (iteration: IterationListItem) =>
  sumNonNull(tokenMetrics.map(([, metric]) => iteration[metric]));

const totalRunTokens = (iterations: IterationListItem[]) =>
  sumNonNull(
    iterations.flatMap((iteration) =>
      tokenMetrics.map(([, metric]) => iteration[metric]),
    ),
  );

const eventIterationNumber = (event: EventListItem) => {
  const payload = event.payload as { iteration?: unknown };
  return typeof payload.iteration === "number" ? payload.iteration : null;
};

const EventRow = ({ event }: { event: EventListItem }) => (
  <li className="rounded-md border border-border bg-card p-4">
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Status value={event.type} />
      <span className="text-muted">
        #{event.sequenceNumber} - {formatDateTime(event.timestamp)}
      </span>
    </div>
    <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-card-soft p-3 text-fg text-sm">
      {eventBody(event)}
    </pre>
  </li>
);

const TokenPanel = ({ iterations }: { iterations: IterationListItem[] }) => (
  <section className="overflow-hidden rounded-md border border-border bg-card">
    <div className="border-border border-b px-4 py-3">
      <h2 className="font-medium text-fg">Token usage</h2>
    </div>
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-card-soft text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Scope</th>
          {tokenMetrics.map(([label]) => (
            <th className="px-4 py-3 font-medium" key={label}>
              {label}
            </th>
          ))}
          <th className="px-4 py-3 font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {iterations.map((iteration) => (
          <tr className="border-border border-t" key={iteration.id}>
            <td className="px-4 py-3 font-medium text-fg">
              Iteration {iteration.n}
            </td>
            {tokenMetrics.map(([label, metric]) => (
              <td className="px-4 py-3 text-fg" key={label}>
                {formatTokens(iteration[metric])}
              </td>
            ))}
            <td className="px-4 py-3 text-fg">
              {formatTokens(totalIterationTokens(iteration))}
            </td>
          </tr>
        ))}
        <tr className="border-border border-t bg-card-soft">
          <td className="px-4 py-3 font-medium text-fg">Run total</td>
          {tokenMetrics.map(([label, metric]) => (
            <td className="px-4 py-3 text-fg" key={label}>
              {formatTokens(sumIterationTokens(iterations, metric))}
            </td>
          ))}
          <td className="px-4 py-3 text-fg">
            {formatTokens(totalRunTokens(iterations))}
          </td>
        </tr>
      </tbody>
    </table>
  </section>
);

const EventTimeline = ({
  events,
  iterations,
}: {
  events: EventListItem[];
  iterations: IterationListItem[];
}) => {
  if (events.length === 0) {
    return <EmptyState>No Events have been captured for this Run.</EmptyState>;
  }

  if (iterations.length === 0) {
    return (
      <ol className="flex flex-col gap-3">
        {events.map((event) => (
          <EventRow event={event} key={event.id} />
        ))}
      </ol>
    );
  }

  const eventsByIterationId = new Map<string, EventListItem[]>(
    iterations.map((iteration) => [iteration.id, []]),
  );
  const iterationIdByNumber = new Map(
    iterations.map((iteration) => [iteration.n, iteration.id]),
  );
  const unassignedEvents: EventListItem[] = [];

  for (const event of events) {
    const payloadIterationNumber = eventIterationNumber(event);
    const iterationId =
      event.iterationId ??
      (payloadIterationNumber === null
        ? undefined
        : iterationIdByNumber.get(payloadIterationNumber));
    const iterationEvents = iterationId
      ? eventsByIterationId.get(iterationId)
      : undefined;

    if (iterationEvents) {
      iterationEvents.push(event);
    } else {
      unassignedEvents.push(event);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {iterations.map((iteration) => {
        const iterationEvents = eventsByIterationId.get(iteration.id) ?? [];
        return (
          <section className="flex flex-col gap-3" key={iteration.id}>
            <div className="flex flex-wrap items-center gap-3 border-border border-l-4 bg-card-soft px-4 py-3 text-sm">
              <span className="font-medium text-fg">
                Iteration {iteration.n}/{iterations.length}
              </span>
              <span className="text-muted">
                {formatDateTime(iteration.startedAt)} -{" "}
                {formatDateTime(iteration.endedAt)}
              </span>
            </div>
            {iterationEvents.length === 0 ? (
              <EmptyState>No Events captured for this iteration.</EmptyState>
            ) : (
              <ol className="flex flex-col gap-3">
                {iterationEvents.map((event) => (
                  <EventRow event={event} key={event.id} />
                ))}
              </ol>
            )}
          </section>
        );
      })}
      {unassignedEvents.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="border-border border-l-4 bg-card-soft px-4 py-3 font-medium text-fg text-sm">
            Unassigned Events
          </div>
          <ol className="flex flex-col gap-3">
            {unassignedEvents.map((event) => (
              <EventRow event={event} key={event.id} />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
};

export function RunDetailPage({
  run,
  iterations,
  events,
}: {
  run: Run;
  iterations: IterationListItem[];
  events: EventListItem[];
}) {
  const canCancel = run.status === "running";

  return (
    <PageShell eyebrow="Run" title={run.name}>
      <div className="grid gap-3 rounded-md border border-border bg-card p-4 text-sm md:grid-cols-5">
        <div>
          <div className="text-muted">Status</div>
          <Status value={run.status} />
        </div>
        <div>
          <div className="text-muted">Agent Provider</div>
          <div className="text-fg">
            {run.agentProvider}
            {run.agentModel ? ` / ${run.agentModel}` : ""}
          </div>
        </div>
        <div>
          <div className="text-muted">Sandbox Provider</div>
          <div className="text-fg">{run.sandboxProvider}</div>
        </div>
        <div>
          <div className="text-muted">Duration</div>
          <div className="text-fg">
            {formatDuration(run.startedAt, run.endedAt)}
          </div>
        </div>
        <div className="flex items-end md:justify-end">
          {canCancel ? <CancelRunButton runId={run.id} /> : null}
        </div>
      </div>
      <TokenPanel iterations={iterations} />
      <EventTimeline events={events} iterations={iterations} />
    </PageShell>
  );
}
