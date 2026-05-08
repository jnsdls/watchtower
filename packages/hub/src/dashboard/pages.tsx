import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
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
import { CancelRunButton } from "./cancel-run-button";
import { formatDateTime, formatDuration, formatTokens } from "./format";
import { StatusPill, type StatusPillStatus } from "./primitives";

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
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Runs</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  className="relative border-border border-t transition-colors hover:bg-hover focus-within:bg-hover"
                  key={job.id}
                >
                  <td className="px-4 py-3 text-fg">
                    <Link
                      aria-label={`Open Job started ${formatDateTime(job.startedAt)}`}
                      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      href={`/jobs/${job.id}`}
                    />
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
              ))}
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
    <PageShell eyebrow="Job" title={job.id}>
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
