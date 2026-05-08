import {
  BarChart3,
  ChevronRight,
  Clock,
  Clock3,
  Copy,
  FileText,
  Filter,
  GitBranch,
  GitCompare,
  GitCompareArrows,
  Hammer,
  Layers,
  SquareArrowOutUpRight,
  Terminal,
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
import { CancelJobButton } from "./cancel-job-button";
import { CancelRunButton } from "./cancel-run-button";
import {
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  formatTokens,
} from "./format";
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

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    aria-label="GitHub"
    className={className}
    fill="currentColor"
    role="img"
    viewBox="0 0 24 24"
  >
    <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.16c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.07.78 2.16v3.2c0 .31.21.66.79.55 4.57-1.52 7.86-5.83 7.86-10.9C23.5 5.66 18.34.5 12 .5Z" />
  </svg>
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

const statusBarFillClass = (status: string) => {
  switch (status) {
    case "running":
      return "bg-st-running";
    case "failed":
      return "bg-st-failed";
    case "canceled":
      return "bg-st-canceled";
    default:
      return "bg-st-succeeded";
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
        runs: assignTracks([run], timelineEnd),
      }));
    const earliestStart = (lane: GanttLane) =>
      lane.runs.length === 0
        ? Number.POSITIVE_INFINITY
        : Math.min(...lane.runs.map((run) => run.startedAt.getTime()));

    return {
      modeLabel: "Task lanes",
      lanes: [...taskLanes, ...frameworkLanes].sort(
        (left, right) => earliestStart(left) - earliestStart(right),
      ),
    };
  }

  const firstStartByName = new Map<string, number>();
  for (const run of runs) {
    const start = run.startedAt.getTime();
    const previous = firstStartByName.get(run.name);
    if (previous === undefined || start < previous) {
      firstStartByName.set(run.name, start);
    }
  }
  const runNames = [...firstStartByName.keys()].sort(
    (left, right) =>
      (firstStartByName.get(left) ?? 0) - (firstStartByName.get(right) ?? 0),
  );

  return {
    modeLabel: "Run name",
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
  const isLive = runs.some((run) => run.status === "running");
  const ticks = Array.from({ length: 10 }, (_, index) => ({
    label:
      index === 9 && isLive
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
            {(
              [
                ["task", "Task lanes"],
                ["runName", "Run name"],
                ["flat", "Flat"],
              ] satisfies [GanttMode, string][]
            ).map(([candidateMode, label]) => (
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
            {isLive ? "now" : formatTime(timelineEnd)}
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
                            className={`absolute inset-0 opacity-30 ${statusBarFillClass(
                              run.status,
                            )}`}
                          />
                          <span className="truncate">
                            {run.name} · {run.status}
                          </span>
                          {run.status === "running" ? (
                            <span
                              aria-hidden="true"
                              className="absolute top-0 right-0 bottom-0 flex animate-wt-pulse items-center overflow-visible"
                            >
                              <span className="h-full w-0.5 bg-st-running" />
                              <span className="h-0 w-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-st-running" />
                            </span>
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
  if (projects.length === 0) {
    return <EmptyHubState />;
  }

  const now = new Date();
  const activeProjectCount = projects.filter((project) => {
    const ageMs = now.getTime() - project.latestActivityAt.getTime();
    return ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000;
  }).length;

  return (
    <main className="flex flex-1 flex-col gap-3.5 overflow-auto px-7 py-5">
      <header className="flex items-baseline gap-3">
        <h1 className="m-0 font-semibold text-[18px] text-fg">Projects</h1>
        <Mono className="text-[12px] text-muted">
          {projects.length} · {activeProjectCount} active in last 24h
        </Mono>
        <span className="flex-1" />
        <Button disabled type="button" variant="ghost">
          <Filter aria-hidden="true" className="size-3.5" />
          Filter
        </Button>
      </header>

      <div className="overflow-hidden rounded-[7px] border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-card-soft text-[11px] text-muted uppercase">
            <tr>
              <th className="w-[32%] px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Latest activity</th>
              <th className="px-4 py-3 text-right font-medium">Jobs</th>
              <th className="px-4 py-3 text-right font-medium">Runs</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const latestActivity = formatRelativeTime(
                project.latestActivityAt,
                now,
              );

              return (
                <tr
                  className="relative h-[38px] border-border border-t transition-colors hover:bg-hover focus-within:bg-hover"
                  key={project.id}
                >
                  <td className="px-4 py-3">
                    <Link
                      aria-label={`Open ${project.displayName}`}
                      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      href={`/projects/${project.id}`}
                    />
                    <div className="flex items-center gap-2.5">
                      <GithubIcon className="size-3.5 shrink-0 text-muted" />
                      <div className="flex min-w-0 flex-col gap-px">
                        <span className="truncate font-medium text-fg">
                          {project.displayName}
                        </span>
                        <Mono className="truncate text-[11px] text-muted">
                          {project.gitRemoteUrl ?? project.localPath ?? "n/a"}
                        </Mono>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {project.runningCount > 0 ? (
                        <>
                          <StatusPill status="running">
                            {project.runningCount} running
                          </StatusPill>
                          <Mono className="text-[11px] text-muted">
                            {latestActivity}
                          </Mono>
                        </>
                      ) : (
                        <Mono className="text-[12px] text-muted">
                          {latestActivity}
                        </Mono>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-fg">
                    <Num>{project.jobCount}</Num>
                  </td>
                  <td className="px-4 py-3 text-right text-fg">
                    <Num>{project.runCount}</Num>
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
    </main>
  );
}

const EmptyHubState = () => (
  <main className="flex min-h-[calc(100vh-56px)] flex-1 items-center justify-center px-6 py-6">
    <div className="flex w-full max-w-[560px] flex-col gap-[18px]">
      <div className="flex items-center gap-2">
        <span className="size-[7px] rounded-full bg-st-succeeded" />
        <Mono className="text-[11px] text-muted uppercase tracking-[0.06em]">
          Hub online · :7777 · pglite
        </Mono>
      </div>
      <div>
        <h1 className="m-0 font-semibold text-[26px] text-fg">
          Watching for runs.
        </h1>
        <p className="mt-2 max-w-[480px] text-[14px] text-muted leading-[1.55]">
          No Jobs yet. Start one from any Project with sandcastle installed -
          this view will update as soon as data lands.
        </p>
      </div>
      <div className="overflow-hidden rounded-[7px] border border-border bg-card">
        <div className="flex items-center gap-2 border-border border-b bg-bg-elev px-3 py-2">
          <Terminal aria-hidden="true" className="size-3.5 text-muted" />
          <Mono className="text-[11px] text-muted">~/code/watchtower</Mono>
          <span className="flex-1" />
          <Button
            aria-label="Copy watchtower run command"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
        <div className="px-4 pt-3.5 pb-2 font-mono text-[13px] text-fg leading-[1.7]">
          <span className="text-muted-2">$</span> watchtower run main.ts
        </div>
        <div className="px-4 pb-3.5 font-mono text-[12px] text-muted leading-[1.6]">
          <div>
            <span className="text-st-succeeded">✓</span> sandcastle 0.4.2
            detected
          </div>
          <div>
            <span className="text-st-succeeded">✓</span> reporting to{" "}
            <Mono className="text-accent">http://localhost:7777</Mono>
          </div>
          <div className="text-muted-2">waiting for sandcastle.run()</div>
        </div>
      </div>
      <div className="mt-1 flex flex-col overflow-hidden rounded-[7px] border border-border bg-card">
        <EmptyHubLinkCard
          description="Configure sandcastle, define a Job, ship one Task."
          href="https://github.com/jnsdls/watchtower"
          icon={<FileText aria-hidden="true" className="size-3.5" />}
          label="Read the docs"
          meta="github.com/jnsdls/watchtower"
        />
        <EmptyHubLinkCard
          description="Plan / implement / review - adapt a starter file."
          href="https://github.com/jnsdls/watchtower/tree/main/.sandcastle"
          icon={<Layers aria-hidden="true" className="size-3.5" />}
          label="Try a starter template"
          meta=".sandcastle/main.ts"
        />
      </div>
    </div>
  </main>
);

const EmptyHubLinkCard = ({
  description,
  href,
  icon,
  label,
  meta,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  label: string;
  meta: string;
}) => (
  <a
    className="grid grid-cols-[32px_1fr_auto] items-center gap-3 border-border border-b px-3.5 py-3 text-fg-soft transition-colors last:border-b-0 hover:bg-hover"
    href={href}
  >
    <span className="inline-flex size-7 items-center justify-center rounded-[6px] border border-border bg-card-soft text-muted">
      {icon}
    </span>
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[13px] text-fg">{label}</span>
      <Mono className="truncate text-[11px] text-muted">{description}</Mono>
    </span>
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-2">
      <Mono>{meta}</Mono>
      <ChevronRight aria-hidden="true" className="size-3.5" />
    </span>
  </a>
);

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
      {runs.length === 0 ? (
        <EmptyState>No Runs have been captured for this Job.</EmptyState>
      ) : (
        <>
          <JobGantt
            job={job}
            mode={activeGanttMode}
            runs={runs}
            tasks={tasks}
          />
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
                    <tr
                      className="h-[38px] border-border border-t"
                      key={task.id}
                    >
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
                        <Mono>
                          {formatDuration(run.startedAt, run.endedAt)}
                        </Mono>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </main>
  );
}

const shortId = (prefix: string, id: string) => `${prefix}_${id.slice(0, 6)}`;

const textEventBody = (event: EventListItem) => {
  const payload = event.payload as { message?: unknown; text?: unknown };
  return String(payload.message ?? payload.text ?? "");
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
            {textEventBody(event)}
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
                {formatDuration(turn.startedAt, turn.endedAt)}
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
