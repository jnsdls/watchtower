import {
  BarChart3,
  ChevronRight,
  Clock3,
  GitBranch,
  GitCompare,
  Hammer,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "../components/ui/button";
import type {
  getJob,
  getProject,
  getRun,
  getTask,
  listEventsForRun,
  listIterationsForRun,
  listJobsForProjectSummary,
  listProjectsByRecentActivity,
  listRunsForJob,
  listTasksForJob,
} from "../db/queries";
import { costForRun } from "../pricing/rates";
import { CancelRunButton } from "./cancel-run-button";
import { formatDateTime, formatDuration, formatTokens } from "./format";
import {
  LiveDuration,
  Mono,
  Num,
  StatusPill,
  type StatusPillStatus,
} from "./primitives";
import { CopyLogsButton } from "./run-detail-actions";
import { AutoScrollTimeline } from "./run-detail-auto-scroll";
import {
  buildRunDetailState,
  type RunDetailEvent,
  type RunDetailIteration,
  type RunDetailTurn,
} from "./run-detail-state";

type ProjectListItem = Awaited<
  ReturnType<typeof listProjectsByRecentActivity>
>[number];
type Project = NonNullable<Awaited<ReturnType<typeof getProject>>>;
type Job = NonNullable<Awaited<ReturnType<typeof getJob>>>;
type Run = NonNullable<Awaited<ReturnType<typeof getRun>>>;
type Task = NonNullable<Awaited<ReturnType<typeof getTask>>>;
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
      return "bg-st-running text-bg wt-running-stripe hover:bg-st-running";
    case "succeeded":
    case "completed":
      return "bg-st-succeeded text-bg hover:bg-st-succeeded";
    case "failed":
      return "bg-st-failed text-bg hover:bg-st-failed";
    case "canceled":
      return "bg-st-canceled text-bg hover:bg-st-canceled";
    default:
      return "bg-muted text-bg hover:bg-muted";
  }
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const percentBetween = (date: Date, start: Date, spanMs: number) =>
  clampPercent(((date.getTime() - start.getTime()) / spanMs) * 100);

const fallbackTimelineEnd = (start: Date) => new Date(start.getTime() + 60_000);

type GanttBar = RunListItem & {
  track: number;
};

type GanttLane = {
  id: string;
  label: string;
  detail: string | null;
  runs: GanttBar[];
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
}: {
  runs: RunListItem[];
  tasks: TaskListItem[];
  timelineEnd: Date;
}) => {
  if (tasks.length > 0) {
    return {
      modeLabel: "Swimlanes by Task",
      lanes: tasks.map<GanttLane>((task) => ({
        id: task.id,
        label: task.title,
        detail: task.branch ?? task.externalId,
        runs: assignTracks(
          runs.filter((run) => run.taskId === task.id),
          timelineEnd,
        ),
      })),
    };
  }

  const runNames = [...new Set(runs.map((run) => run.name))].sort(
    (left, right) => left.localeCompare(right),
  );

  return {
    modeLabel: "Swimlanes by Run name",
    lanes: runNames.map<GanttLane>((name) => ({
      id: name,
      label: name,
      detail: null,
      runs: assignTracks(
        runs.filter((run) => run.name === name),
        timelineEnd,
      ),
    })),
  };
};

const JobGantt = ({
  job,
  runs,
  tasks,
}: {
  job: Job;
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
  });

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-4 py-3">
        <div>
          <h2 className="font-medium text-fg">Run timeline</h2>
          <p className="text-muted text-sm">{modeLabel}</p>
        </div>
        <div className="text-muted text-sm">
          {formatDateTime(job.startedAt)} - {formatDateTime(timelineEnd)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[13rem_minmax(32rem,1fr)] border-border border-b bg-card-soft text-muted text-xs">
            <div className="px-4 py-3 font-medium">Swimlane</div>
            <div className="relative px-4 py-3">
              <div className="flex justify-between">
                <span>{formatDateTime(job.startedAt)}</span>
                <span>{formatDateTime(timelineEnd)}</span>
              </div>
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
                <div className="flex min-h-20 flex-col justify-center px-4 py-3">
                  <div className="break-words font-medium text-fg text-sm">
                    {lane.label}
                  </div>
                  {lane.detail ? (
                    <div className="mt-1 break-words text-muted text-xs">
                      {lane.detail}
                    </div>
                  ) : null}
                </div>
                <div
                  className="relative border-border border-l bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px)] bg-[length:25%_100%] px-4 py-3"
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
                          className={`absolute flex h-8 items-center overflow-hidden rounded-md px-3 font-medium text-xs shadow-sm transition-colors ${statusBarClass(
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
                          <span className="truncate">
                            {run.name} · {run.status}
                          </span>
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
  job,
  runs,
  tasks,
}: {
  job: Job;
  runs: RunListItem[];
  tasks: TaskListItem[];
}) {
  const runsByTaskId = new Map<string, RunListItem[]>();
  for (const run of runs) {
    if (!run.taskId) {
      continue;
    }

    const taskRuns = runsByTaskId.get(run.taskId) ?? [];
    taskRuns.push(run);
    runsByTaskId.set(run.taskId, taskRuns);
  }

  return (
    <PageShell eyebrow="Job" title={formatJobTitle(job)}>
      {runs.length > 0 ? (
        <JobGantt job={job} runs={runs} tasks={tasks} />
      ) : null}
      {tasks.length > 0 ? (
        <section className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-border border-b px-4 py-3">
            <h2 className="font-medium text-fg">Tasks</h2>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-card-soft text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Runs</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const taskRuns = runsByTaskId.get(task.id) ?? [];

                return (
                  <tr className="border-border border-t" key={task.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{task.title}</div>
                      <div className="text-muted">{task.externalId}</div>
                    </td>
                    <td className="px-4 py-3 text-fg">
                      {task.branch ?? "n/a"}
                    </td>
                    <td className="px-4 py-3">
                      <Status value={task.status} />
                    </td>
                    <td className="px-4 py-3 text-fg">
                      {taskRuns.length === 0
                        ? "n/a"
                        : taskRuns.map((run) => run.name).join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
      {runs.length === 0 ? (
        <EmptyState>No Runs have been captured for this Job.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-card-soft text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Run</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Agent Provider</th>
                <th className="px-4 py-3 font-medium">Sandbox Provider</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  className="relative border-border border-t transition-colors hover:bg-hover focus-within:bg-hover"
                  key={run.id}
                >
                  <td className="px-4 py-3 font-medium text-fg">
                    <Link
                      aria-label={`Open ${run.name} Run`}
                      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      href={`/runs/${run.id}`}
                    />
                    {run.name}
                  </td>
                  <td className="px-4 py-3">
                    <Status value={run.status} />
                  </td>
                  <td className="px-4 py-3 text-fg">
                    {run.agentProvider}
                    {run.agentModel ? ` / ${run.agentModel}` : ""}
                  </td>
                  <td className="px-4 py-3 text-fg">{run.sandboxProvider}</td>
                  <td className="px-4 py-3 text-fg">
                    {formatDuration(run.startedAt, run.endedAt)}
                  </td>
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

const shortId = (prefix: string, id: string) => `${prefix}_${id.slice(0, 6)}`;

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

const formatUsd = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("en", {
        currency: "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: "currency",
      }).format(value);

const rawEventStream = (events: EventListItem[]) =>
  events
    .map((event) =>
      JSON.stringify({
        payload: event.payload,
        sequenceNumber: event.sequenceNumber,
        timestamp: event.timestamp.toISOString(),
        type: event.type,
      }),
    )
    .join("\n");

const timeOnly = (date: Date | null) =>
  date
    ? new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      }).format(date)
    : "n/a";

const iterationDuration = (iteration: RunDetailIteration) =>
  formatDuration(iteration.startedAt, iteration.endedAt);

const RunHeader = ({
  activeIteration,
  events,
  isMultiIteration,
  run,
  task,
}: {
  activeIteration: RunDetailIteration;
  events: EventListItem[];
  isMultiIteration: boolean;
  run: Run;
  task: Task | null;
}) => (
  <header className="flex flex-col gap-2 border-border border-b pb-5">
    <div className="flex flex-wrap items-center gap-2">
      <Mono className="text-[11px] text-muted">
        RUN · {shortId("r", run.id)}
      </Mono>
      <Status value={run.status} />
      <Mono className="text-[11px] text-muted">{run.name}</Mono>
      <span aria-hidden="true" className="h-3 w-px bg-border-strong" />
      {isMultiIteration ? (
        <Mono className="text-[11px] text-muted">
          iteration {activeIteration.n} / {run.maxIterations ?? "?"}
        </Mono>
      ) : (
        <Mono className="text-[11px] text-muted">iteration 1</Mono>
      )}
      <Mono className="text-[11px] text-muted">
        · turn {activeIteration.turnCount}
      </Mono>
    </div>
    <h1 className="font-semibold text-fg text-xl leading-snug">
      {task?.title ?? run.name}
    </h1>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 text-muted text-xs">
        <span className="inline-flex items-center gap-1">
          <Clock3 aria-hidden="true" className="size-3.5" />
          Started {timeOnly(run.startedAt)} ·{" "}
          <LiveDuration
            className={run.endedAt ? undefined : "text-st-running"}
            endedAt={run.endedAt}
            startedAt={run.startedAt}
          />
        </span>
        {run.branch ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <GitBranch aria-hidden="true" className="size-3.5" />
            <Mono className="truncate">{run.branch}</Mono>
          </span>
        ) : null}
        {run.agentModel ? <Mono>{run.agentModel}</Mono> : null}
        <Mono>{run.sandboxProvider}</Mono>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyLogsButton logs={rawEventStream(events)} />
        <Button type="button" variant="ghost">
          <GitCompare aria-hidden="true" className="size-4" />
          Compare to last
        </Button>
        {run.status === "running" ? <CancelRunButton runId={run.id} /> : null}
      </div>
    </div>
  </header>
);

const IterationSwitcher = ({
  activeIterationNumber,
  iterations,
}: {
  activeIterationNumber: number;
  iterations: RunDetailIteration[];
}) => {
  if (iterations.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Iterations"
      className="flex overflow-hidden rounded-md border border-border bg-bg-elev"
    >
      {iterations.map((iteration) => {
        const active = iteration.n === activeIterationNumber;

        return (
          <Link
            className={`flex flex-1 flex-col gap-1 border-border border-r px-3 py-2 text-left last:border-r-0 ${
              active
                ? "border-t-2 border-t-accent bg-card"
                : "border-t-2 border-t-transparent"
            }`}
            data-active={active}
            href={`?iter=${iteration.n}`}
            key={iteration.id}
          >
            <span className="flex items-center gap-2">
              <Mono
                className={
                  active ? "text-[11px] text-fg" : "text-[11px] text-muted"
                }
              >
                iteration {iteration.n}
              </Mono>
              <StatusPill status={iteration.status}>
                {iteration.status}
              </StatusPill>
            </span>
            <Mono className="text-[11px] text-muted-2">
              {iteration.turnCount} turns · {iterationDuration(iteration)}
            </Mono>
          </Link>
        );
      })}
    </nav>
  );
};

const EventCard = ({ event }: { event: RunDetailEvent }) => {
  if (event.type === "text") {
    return (
      <li className="rounded-md border border-border bg-card px-3 py-2">
        <div className="flex gap-3">
          <Mono className="w-14 shrink-0 text-[10px] text-muted">
            {timeOnly(event.timestamp)}
          </Mono>
          <div className="whitespace-pre-wrap break-words text-fg-soft text-sm leading-relaxed">
            {eventBody(event)}
          </div>
        </div>
      </li>
    );
  }

  const payload = event.payload as { name?: unknown; formattedArgs?: unknown };
  const name =
    typeof payload.name === "string" && payload.name.length > 0
      ? payload.name
      : "tool";

  return (
    <li
      className="rounded-md border border-border bg-card px-3 py-2"
      title={`${name} ${String(payload.formattedArgs ?? "")}`.trim()}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Mono className="w-14 shrink-0 text-[10px] text-muted">
          {timeOnly(event.timestamp)}
        </Mono>
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card-soft text-fg-soft">
          <Hammer aria-hidden="true" className="size-3.5" />
        </span>
        <Mono className="min-w-14 text-fg text-xs">{name}</Mono>
        <Mono className="truncate text-muted text-xs">
          {String(payload.formattedArgs ?? "")}
        </Mono>
      </div>
    </li>
  );
};

const TurnRail = ({
  iterationTokenTotal,
  turns,
}: {
  iterationTokenTotal: number | null;
  turns: RunDetailTurn[];
}) => {
  if (turns.length === 0) {
    return (
      <EmptyState>No Events have been captured for this iteration.</EmptyState>
    );
  }

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute top-1 bottom-0 left-[18px] w-px bg-border"
      />
      <div className="flex flex-col gap-4">
        {turns.map((turn) => (
          <section className="relative" key={turn.n}>
            <div className="mb-2 flex items-center gap-2">
              <div className="z-10 inline-flex h-[22px] w-9 items-center justify-center rounded border border-border bg-card-soft font-mono text-[11px] text-fg">
                #{String(turn.n).padStart(2, "0")}
              </div>
              <Mono className="text-[11px] text-fg-soft">turn {turn.n}</Mono>
              <Mono className="text-[11px] text-muted">
                · {formatTokens(iterationTokenTotal)} tok ·{" "}
                {formatDuration(
                  turn.startedAt ?? new Date(0),
                  turn.endedAt ?? turn.startedAt,
                )}
              </Mono>
            </div>
            <ol className="flex flex-col gap-2 pl-9">
              {turn.events.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
};

const MetadataRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <>
    <Mono className="text-muted text-xs">{label}</Mono>
    <div className="min-w-0 text-fg-soft text-xs">{children}</div>
  </>
);

const StatTile = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2">
    <Mono className="text-[10px] text-muted uppercase">{label}</Mono>
    <Mono className="text-fg text-xs">{value}</Mono>
  </div>
);

const RunRightRail = ({
  activeIteration,
  cost,
  isMultiIteration,
  iterationCount,
  job,
  run,
  task,
  toolsUsed,
}: {
  activeIteration: RunDetailIteration;
  cost: number | null;
  isMultiIteration: boolean;
  iterationCount: number;
  job: Job | null;
  run: Run;
  task: Task | null;
  toolsUsed: { name: string; count: number; ratio: number }[];
}) => (
  <aside className="flex flex-col gap-4 border-border border-l bg-bg-elev px-5 py-5">
    <section>
      <h2 className="mb-3 font-mono text-[11px] text-muted uppercase">
        Run metadata
      </h2>
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-2">
        <MetadataRow label="ID">
          <span className="inline-flex items-center gap-2">
            <Mono>{shortId("r", run.id)}</Mono>
            <CopyLogsButton label="Copy ID" logs={run.id} />
          </span>
        </MetadataRow>
        <MetadataRow label="Name">
          <Mono>{run.name}</Mono>
        </MetadataRow>
        <MetadataRow label="Job">
          <Link
            className="inline-flex items-center gap-1 text-fg hover:text-accent"
            href={`/jobs/${run.jobId}`}
          >
            <Mono>{shortId("j", run.jobId)}</Mono>
            <SquareArrowOutUpRight aria-hidden="true" className="size-3" />
          </Link>
        </MetadataRow>
        <MetadataRow label="Task">
          <span className="block truncate">{task?.title ?? "—"}</span>
        </MetadataRow>
        <MetadataRow label="Status">
          <Status value={run.status} />
        </MetadataRow>
        <MetadataRow label="Agent">
          <Mono>{run.agentProvider}</Mono>
        </MetadataRow>
        <MetadataRow label="Model">
          <Mono>{run.agentModel ?? "—"}</Mono>
        </MetadataRow>
        <MetadataRow label="Sandbox">
          <Mono>{run.sandboxProvider}</Mono>
        </MetadataRow>
        <MetadataRow label="Branch">
          <Mono className="block truncate">
            {run.branch ?? task?.branch ?? "—"}
          </Mono>
        </MetadataRow>
        <MetadataRow label="Started">
          <Mono>{timeOnly(run.startedAt)}</Mono>
        </MetadataRow>
        <MetadataRow label="Elapsed">
          <LiveDuration
            className={run.endedAt ? undefined : "text-st-running"}
            endedAt={run.endedAt}
            startedAt={run.startedAt}
          />
        </MetadataRow>
        <MetadataRow label="Iterations">
          <Mono>
            {isMultiIteration
              ? `${activeIteration.n} / ${run.maxIterations ?? iterationCount}`
              : "1"}
          </Mono>
        </MetadataRow>
      </div>
      {job?.title ? (
        <p className="mt-3 truncate text-muted text-xs">{job.title}</p>
      ) : null}
    </section>

    <div className="h-px bg-border" />

    <section>
      <h2 className="mb-3 font-mono text-[11px] text-muted uppercase">
        This iteration
      </h2>
      <div className="mb-3 flex items-baseline gap-2">
        <Mono className="text-fg text-xl">
          turn {activeIteration.turnCount}
        </Mono>
        <LiveDuration
          className={
            run.endedAt
              ? "text-muted text-[11px]"
              : "text-st-running text-[11px]"
          }
          endedAt={activeIteration.endedAt}
          startedAt={activeIteration.startedAt}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="tokens"
          value={formatTokens(activeIteration.tokenTotal)}
        />
        <StatTile
          label="events"
          value={<Num>{activeIteration.eventCount}</Num>}
        />
        <StatTile
          label="tools"
          value={<Num>{activeIteration.toolCount}</Num>}
        />
        <StatTile label="cost" value={formatUsd(cost)} />
      </div>
    </section>

    <div className="h-px bg-border" />

    <section>
      <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] text-muted uppercase">
        <BarChart3 aria-hidden="true" className="size-3.5" />
        Tools used
      </h2>
      {toolsUsed.length === 0 ? (
        <Mono className="text-muted text-xs">—</Mono>
      ) : (
        <div className="flex flex-col gap-2">
          {toolsUsed.map((tool) => (
            <div
              className="grid grid-cols-[4.25rem_minmax(0,1fr)_2rem] items-center gap-2"
              key={tool.name}
            >
              <Mono className="truncate text-fg text-[11px]">{tool.name}</Mono>
              <div className="h-1.5 overflow-hidden rounded-full bg-card-soft">
                <div
                  className="h-full bg-accent opacity-60"
                  style={{ width: `${tool.ratio * 100}%` }}
                />
              </div>
              <Num className="text-right text-muted text-[11px]">
                {tool.count}
              </Num>
            </div>
          ))}
        </div>
      )}
    </section>
  </aside>
);

export function RunDetailPage({
  run,
  iterations,
  events,
  activeIterationNumber,
  job = null,
  task = null,
}: {
  run: Run;
  iterations: IterationListItem[];
  events: EventListItem[];
  activeIterationNumber?: number | null;
  job?: Job | null;
  task?: Task | null;
}) {
  const detail = buildRunDetailState({
    activeIterationNumber,
    events,
    iterations,
    run,
  });
  const cost = costForRun(
    run,
    detail.activeIteration.row ? [detail.activeIteration.row] : [],
  );

  return (
    <main className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
      <div className="flex min-w-0 flex-col gap-5 px-7 py-6">
        <RunHeader
          activeIteration={detail.activeIteration}
          events={events}
          isMultiIteration={detail.isMultiIteration}
          run={run}
          task={task}
        />
        <IterationSwitcher
          activeIterationNumber={detail.activeIterationNumber}
          iterations={detail.iterations}
        />
        <AutoScrollTimeline
          defaultEnabled={run.status === "running"}
          eventCount={detail.activeIteration.eventCount}
        >
          <TurnRail
            iterationTokenTotal={detail.activeIteration.tokenTotal}
            turns={detail.turns}
          />
        </AutoScrollTimeline>
      </div>
      <RunRightRail
        activeIteration={detail.activeIteration}
        cost={cost}
        isMultiIteration={detail.isMultiIteration}
        iterationCount={detail.iterations.length}
        job={job}
        run={run}
        task={task}
        toolsUsed={detail.toolsUsed}
      />
    </main>
  );
}
