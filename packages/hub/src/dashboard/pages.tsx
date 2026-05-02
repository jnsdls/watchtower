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
import { formatDateTime, formatDuration, formatTokens } from "./format";
import { LiveUpdates } from "./live-updates";

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
    <LiveUpdates />
    <header className="flex flex-col gap-2 border-slate-200 border-b pb-4">
      <p className="font-medium text-slate-500 text-sm">{eyebrow}</p>
      <h1 className="font-semibold text-3xl text-slate-950">{title}</h1>
    </header>
    {children}
  </main>
);

const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-md border border-slate-200 bg-white p-6 text-slate-600">
    {children}
  </div>
);

const Status = ({ value }: { value: string }) => (
  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 text-xs">
    {value}
  </span>
);

export function ProjectListPage({ projects }: { projects: ProjectListItem[] }) {
  return (
    <PageShell eyebrow="Dashboard" title="Projects">
      {projects.length === 0 ? (
        <EmptyState>No Projects have reported Jobs yet.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Latest activity</th>
                <th className="px-4 py-3 font-medium">Jobs</th>
                <th className="px-4 py-3 font-medium">Runs</th>
                <th className="px-4 py-3 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr className="border-slate-200 border-t" key={project.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">
                      {project.displayName}
                    </div>
                    <div className="text-slate-500">
                      {project.gitRemoteUrl ?? project.localPath ?? "n/a"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDateTime(project.latestActivityAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {project.jobCount}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {project.runCount}
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/projects/${project.id}`}>Open</Link>
                    </Button>
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
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Runs</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr className="border-slate-200 border-t" key={job.id}>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDateTime(job.startedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Status value={job.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDuration(job.startedAt, job.endedAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{job.runCount}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatTokens(job.totalTokens)}
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/jobs/${job.id}`}>Open</Link>
                    </Button>
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
      {tasks.length > 0 ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="border-slate-200 border-b px-4 py-3">
            <h2 className="font-medium text-slate-950">Tasks</h2>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
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
                  <tr className="border-slate-200 border-t" key={task.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">
                        {task.title}
                      </div>
                      <div className="text-slate-500">{task.externalId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {task.branch ?? "n/a"}
                    </td>
                    <td className="px-4 py-3">
                      <Status value={task.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
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
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Run</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Agent Provider</th>
                <th className="px-4 py-3 font-medium">Sandbox Provider</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr className="border-slate-200 border-t" key={run.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">
                    {run.name}
                  </td>
                  <td className="px-4 py-3">
                    <Status value={run.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {run.agentProvider}
                    {run.agentModel ? ` / ${run.agentModel}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {run.sandboxProvider}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDuration(run.startedAt, run.endedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/runs/${run.id}`}>Open</Link>
                    </Button>
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
  <li className="rounded-md border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Status value={event.type} />
      <span className="text-slate-500">
        #{event.sequenceNumber} - {formatDateTime(event.timestamp)}
      </span>
    </div>
    <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-slate-800 text-sm">
      {eventBody(event)}
    </pre>
  </li>
);

const TokenPanel = ({ iterations }: { iterations: IterationListItem[] }) => (
  <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
    <div className="border-slate-200 border-b px-4 py-3">
      <h2 className="font-medium text-slate-950">Token usage</h2>
    </div>
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-slate-50 text-slate-600">
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
          <tr className="border-slate-200 border-t" key={iteration.id}>
            <td className="px-4 py-3 font-medium text-slate-950">
              Iteration {iteration.n}
            </td>
            {tokenMetrics.map(([label, metric]) => (
              <td className="px-4 py-3 text-slate-700" key={label}>
                {formatTokens(iteration[metric])}
              </td>
            ))}
            <td className="px-4 py-3 text-slate-700">
              {formatTokens(totalIterationTokens(iteration))}
            </td>
          </tr>
        ))}
        <tr className="border-slate-200 border-t bg-slate-50">
          <td className="px-4 py-3 font-medium text-slate-950">Run total</td>
          {tokenMetrics.map(([label, metric]) => (
            <td className="px-4 py-3 text-slate-700" key={label}>
              {formatTokens(sumIterationTokens(iterations, metric))}
            </td>
          ))}
          <td className="px-4 py-3 text-slate-700">
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
            <div className="flex flex-wrap items-center gap-3 border-slate-200 border-l-4 bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium text-slate-950">
                Iteration {iteration.n}/{iterations.length}
              </span>
              <span className="text-slate-500">
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
          <div className="border-slate-200 border-l-4 bg-slate-50 px-4 py-3 font-medium text-slate-950 text-sm">
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
  return (
    <PageShell eyebrow="Run" title={run.name}>
      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm md:grid-cols-4">
        <div>
          <div className="text-slate-500">Status</div>
          <Status value={run.status} />
        </div>
        <div>
          <div className="text-slate-500">Agent Provider</div>
          <div className="text-slate-950">
            {run.agentProvider}
            {run.agentModel ? ` / ${run.agentModel}` : ""}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Sandbox Provider</div>
          <div className="text-slate-950">{run.sandboxProvider}</div>
        </div>
        <div>
          <div className="text-slate-500">Duration</div>
          <div className="text-slate-950">
            {formatDuration(run.startedAt, run.endedAt)}
          </div>
        </div>
      </div>
      <TokenPanel iterations={iterations} />
      <EventTimeline events={events} iterations={iterations} />
    </PageShell>
  );
}
