import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  JobDetailPage,
  ProjectDetailPage,
  ProjectListPage,
  RunDetailPage,
} from "./pages";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const projectId = "00000000-0000-4000-8000-000000000001";
const jobId = "00000000-0000-4000-8000-000000000002";
const runId = "00000000-0000-4000-8000-000000000003";
const startedAt = new Date("2026-05-02T20:00:00.000Z");
const endedAt = new Date("2026-05-02T20:03:05.000Z");
const projectMetrics: ComponentProps<typeof ProjectDetailPage>["metrics"] = {
  jobs24h: 1,
  jobsPrevious24h: 0,
  activeRuns: 0,
  activeRunJobs: 0,
  tokens24h: 140,
  cost24h: null,
  successRate30d: 100,
};

describe("Dashboard pages", () => {
  it("renders Project, Job, Run, and Event rows", () => {
    const projectListProps: ComponentProps<typeof ProjectListPage> = {
      projects: [
        {
          id: projectId,
          gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
          localPath: null,
          displayName: "watchtower",
          createdAt: startedAt,
          latestActivityAt: endedAt,
          jobCount: 1,
          runCount: 1,
          runningCount: 0,
        },
      ],
    };
    const projectDetailProps: ComponentProps<typeof ProjectDetailPage> = {
      project: {
        id: projectId,
        gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
        localPath: null,
        displayName: "watchtower",
        createdAt: startedAt,
      },
      jobs: [
        {
          id: jobId,
          projectId,
          startedAt,
          endedAt,
          status: "completed",
          processPid: null,
          watchtowerVersion: null,
          title: "fix: Dashboard Job title",
          template: null,
          runCount: 1,
          totalTokens: 140,
          branch: "sandcastle/issue-19-project-detail-rebuild",
          agentProvider: "codex",
        },
      ],
      metrics: projectMetrics,
    };
    const jobDetailProps: ComponentProps<typeof JobDetailPage> = {
      job: {
        id: jobId,
        projectId,
        startedAt,
        endedAt,
        status: "completed",
        processPid: null,
        watchtowerVersion: null,
        title: "fix: Dashboard Job title",
        template: null,
      },
      tasks: [
        {
          id: "00000000-0000-4000-8000-000000000011",
          jobId,
          externalId: "10",
          title: "Planner extraction",
          branch: "sandcastle/issue-10-planner-extraction",
          status: "in_progress",
          failureCount: 0,
          createdAt: startedAt,
        },
      ],
      runs: [
        {
          id: runId,
          jobId,
          taskId: "00000000-0000-4000-8000-000000000011",
          name: "implementer",
          agentProvider: "codex",
          agentModel: "gpt-5.5",
          sandboxProvider: "docker",
          branch: null,
          maxIterations: null,
          startedAt,
          endedAt: null,
          status: "running",
          cancelRequested: false,
          completionSignal: null,
          configSnapshot: {},
          errorMessage: null,
        },
      ],
    };
    const run = jobDetailProps.runs[0];

    if (!run) {
      throw new Error("Expected test Run");
    }

    const runDetailProps: ComponentProps<typeof RunDetailPage> = {
      run,
      iterations: [],
      events: [
        {
          id: "00000000-0000-4000-8000-000000000004",
          sequenceNumber: 1,
          runId,
          iterationId: null,
          type: "text",
          payload: { message: "checking status" },
          timestamp: startedAt,
        },
        {
          id: "00000000-0000-4000-8000-000000000005",
          sequenceNumber: 2,
          runId,
          iterationId: null,
          type: "toolCall",
          payload: { name: "Bash", formattedArgs: "bun test" },
          timestamp: endedAt,
        },
      ],
    };

    const markup = [
      renderToStaticMarkup(<ProjectListPage {...projectListProps} />),
      renderToStaticMarkup(<ProjectDetailPage {...projectDetailProps} />),
      renderToStaticMarkup(<JobDetailPage {...jobDetailProps} />),
      renderToStaticMarkup(<RunDetailPage {...runDetailProps} />),
    ].join("\n");

    expect(markup).toContain("watchtower");
    expect(markup).toContain("fix: Dashboard Job title");
    expect(markup).toContain("completed");
    expect(markup).toContain("140");
    expect(markup).toContain("implementer");
    expect(markup).toContain("Tasks");
    expect(markup).toContain("Planner extraction");
    expect(markup).toContain("sandcastle/issue-10-planner-extraction");
    expect(markup).toContain("codex");
    expect(markup).toContain("gpt-5.5");
    expect(markup).toContain("docker");
    expect(markup).toContain("running");
    expect(markup).toContain("Cancel");
    expect(markup).toContain("checking status");
    expect(markup).toContain("Bash bun test");
  });

  it("renders the Empty Hub state when no Projects exist", () => {
    const markup = renderToStaticMarkup(<ProjectListPage projects={[]} />);

    expect(markup).toContain("Hub online");
    expect(markup).toContain(":7777");
    expect(markup).toContain("pglite");
    expect(markup).toContain("Watching for runs.");
    expect(markup).toContain("No Jobs yet.");
    expect(markup).toContain("$");
    expect(markup).toContain("watchtower run main.ts");
    expect(markup).toContain("sandcastle 0.4.2 detected");
    expect(markup).toContain("waiting for sandcastle.run()");
    expect(markup).toContain("Read the docs");
    expect(markup).toContain("Try a starter template");
    expect(markup).not.toContain("Configure Hub");
    expect(markup).not.toContain("No Projects have reported Jobs yet.");
  });

  it("renders the redesigned Project table with running counts", () => {
    const markup = renderToStaticMarkup(
      <ProjectListPage
        projects={[
          {
            id: projectId,
            gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
            localPath: null,
            displayName: "watchtower",
            createdAt: startedAt,
            latestActivityAt: new Date(),
            jobCount: 2,
            runCount: 3,
            runningCount: 1,
          },
          {
            id: "00000000-0000-4000-8000-000000000004",
            gitRemoteUrl: "git@github.com:jnsdls/quiet.git",
            localPath: null,
            displayName: "quiet",
            createdAt: startedAt,
            latestActivityAt: endedAt,
            jobCount: 1,
            runCount: 1,
            runningCount: 0,
          },
        ]}
      />,
    );

    expect(markup).toContain("2 · 1 active in last 24h");
    expect(markup).toContain("Filter");
    expect(markup).toContain('disabled=""');
    expect(markup).toContain("GitHub");
    expect(markup).toContain("1 running");
    expect(markup).not.toContain("0 running");
    expect(markup).toContain('href="/projects/');
    expect(markup).toContain('aria-label="Open watchtower"');
  });

  it("renders rebuilt Project detail metrics and Jobs tab", () => {
    const markup = renderToStaticMarkup(
      <ProjectDetailPage
        project={{
          id: projectId,
          gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
          localPath: null,
          displayName: "watchtower",
          createdAt: startedAt,
        }}
        jobs={[
          {
            id: jobId,
            projectId,
            startedAt,
            endedAt,
            status: "succeeded",
            processPid: null,
            watchtowerVersion: null,
            title: "fix: Project detail rebuild",
            template: "plan-impl-review",
            runCount: 3,
            totalTokens: 412_341,
            branch: "sandcastle/issue-19-project-detail-rebuild",
            agentProvider: "codex",
          },
        ]}
        metrics={{
          jobs24h: 4,
          jobsPrevious24h: 1,
          activeRuns: 2,
          activeRunJobs: 1,
          tokens24h: 1_600_030,
          cost24h: 8.275,
          successRate30d: 75,
        }}
      />,
    );

    expect(markup).toContain("watchtower");
    expect(markup).toContain("git@github.com:jnsdls/watchtower.git");
    expect(markup).toContain("Copy run command");
    expect(markup).toContain("Jobs (24h)");
    expect(markup).toContain("↑ 3 vs prev day");
    expect(markup).toContain("Active runs");
    expect(markup).toContain("animate-wt-pulse");
    expect(markup).toContain("across 1 jobs");
    expect(markup).toContain("Tokens (24h)");
    expect(markup).toContain("1.6M");
    expect(markup).toContain("$8.28 est.");
    expect(markup).toContain("Success rate");
    expect(markup).toContain("75%");
    expect(markup).toContain("Status: any");
    expect(markup).toContain("Last 24h");
    expect(markup).toContain("fix: Project detail rebuild");
    expect(markup).toContain("sandcastle/issue-19-project-detail-rebuild");
    expect(markup).toContain("text-pv-codex");
    expect(markup).toContain("412k");
    expect(markup).toContain(
      'href="/jobs/00000000-0000-4000-8000-000000000002"',
    );
    expect(markup).not.toContain(">Template<");
    expect(markup).not.toContain(">Templates<");
    expect(markup).not.toContain(">Settings<");
  });

  it("renders planner-driven Job Gantt swimlanes by Task", () => {
    const taskId = "00000000-0000-4000-8000-000000000011";
    const markup = renderToStaticMarkup(
      <JobDetailPage
        job={{
          id: jobId,
          projectId,
          startedAt,
          endedAt: new Date("2026-05-02T20:10:00.000Z"),
          status: "completed",
          processPid: null,
          watchtowerVersion: null,
          title: null,
          template: null,
        }}
        runs={[
          {
            id: "00000000-0000-4000-8000-000000000021",
            jobId,
            taskId,
            name: "implementer",
            agentProvider: "codex",
            agentModel: "gpt-5.5",
            sandboxProvider: "docker",
            branch: null,
            maxIterations: null,
            startedAt: new Date("2026-05-02T20:01:00.000Z"),
            endedAt: new Date("2026-05-02T20:06:00.000Z"),
            status: "succeeded",
            cancelRequested: false,
            completionSignal: null,
            configSnapshot: {},
            errorMessage: null,
          },
          {
            id: "00000000-0000-4000-8000-000000000022",
            jobId,
            taskId,
            name: "reviewer",
            agentProvider: "claudeCode",
            agentModel: "claude-opus-4-6",
            sandboxProvider: "docker",
            branch: null,
            maxIterations: null,
            startedAt: new Date("2026-05-02T20:04:00.000Z"),
            endedAt: new Date("2026-05-02T20:08:00.000Z"),
            status: "failed",
            cancelRequested: false,
            completionSignal: null,
            configSnapshot: {},
            errorMessage: null,
          },
        ]}
        tasks={[
          {
            id: taskId,
            jobId,
            externalId: "13",
            title: "Job-detail Gantt + swimlanes",
            branch: "sandcastle/issue-13-job-detail-gantt-swimlanes",
            // implementer succeeded + reviewer failed (sequential) →
            // attempt aggregates to "failed", failureCount tracks the
            // failed reviewer Run.
            status: "failed",
            failureCount: 1,
            createdAt: startedAt,
          },
        ]}
      />,
    );

    expect(markup).toContain("Timeline");
    expect(markup).toContain("Task lanes");
    expect(markup).toContain("Job-detail Gantt + swimlanes");
    expect(markup).toContain("implementer");
    expect(markup).toContain("reviewer");
    expect(markup).toContain(
      'href="/runs/00000000-0000-4000-8000-000000000021"',
    );
    expect(markup).toContain('aria-label="Open implementer Run"');
    expect(markup).toContain("bg-st-succeeded");
    expect(markup).toContain("bg-st-failed");
  });

  it("renders rebuilt Job header and task-lane Gantt with framework Runs", () => {
    const taskId = "00000000-0000-4000-8000-000000000011";
    const markup = renderToStaticMarkup(
      <JobDetailPage
        job={{
          id: jobId,
          projectId,
          startedAt,
          endedAt: null,
          status: "running",
          processPid: null,
          watchtowerVersion: null,
          title: "fix: Job detail rebuild",
          template: null,
        }}
        runs={[
          {
            id: "00000000-0000-4000-8000-000000000041",
            jobId,
            taskId: null,
            name: "planner",
            agentProvider: "claudeCode",
            agentModel: "claude-opus-4-6",
            sandboxProvider: "docker",
            branch: "main",
            maxIterations: 1,
            startedAt,
            endedAt: new Date("2026-05-02T20:01:00.000Z"),
            status: "succeeded",
            cancelRequested: false,
            completionSignal: null,
            configSnapshot: {},
            errorMessage: null,
          },
          {
            id: "00000000-0000-4000-8000-000000000042",
            jobId,
            taskId,
            name: "implementer",
            agentProvider: "codex",
            agentModel: "gpt-5.5",
            sandboxProvider: "docker",
            branch: "sandcastle/issue-20-job-detail-cancel-endpoint",
            maxIterations: 2,
            startedAt: new Date("2026-05-02T20:01:00.000Z"),
            endedAt: null,
            status: "running",
            cancelRequested: false,
            completionSignal: null,
            configSnapshot: {},
            errorMessage: null,
          },
        ]}
        tasks={[
          {
            id: taskId,
            jobId,
            externalId: "20",
            title: "Job detail rebuild + Job-level cancel endpoint",
            branch: "sandcastle/issue-20-job-detail-cancel-endpoint",
            status: "in_progress",
            failureCount: 0,
            createdAt: startedAt,
          },
        ]}
      />,
    );

    expect(markup).toContain("JOB · j_000000");
    expect(markup).toContain("1 tasks · 2 runs");
    expect(markup).toContain("fix: Job detail rebuild");
    expect(markup).toContain("Started");
    expect(markup).toContain("watchtower run main.ts");
    expect(markup).toContain("Copy ID");
    expect(markup).toContain("Compare");
    expect(markup).toContain("Cancel job");
    expect(markup).toContain("Task lanes");
    expect(markup).toContain("Run name");
    expect(markup).toContain("Flat");
    expect(markup).toContain("planner");
    expect(markup).toContain("Job detail rebuild + Job-level cancel endpoint");
    expect(markup).toContain("wt-running-stripe");
    expect(markup).toContain("bg-st-running");
    expect(markup).toContain("border-l-st-running");
  });

  it("renders non-planner Job Gantt swimlanes by Run name", () => {
    const markup = renderToStaticMarkup(
      <JobDetailPage
        job={{
          id: jobId,
          projectId,
          startedAt,
          endedAt: new Date("2026-05-02T20:10:00.000Z"),
          status: "completed",
          processPid: null,
          watchtowerVersion: null,
          title: null,
          template: null,
        }}
        runs={[
          {
            id: "00000000-0000-4000-8000-000000000031",
            jobId,
            taskId: null,
            name: "worker",
            agentProvider: "codex",
            agentModel: "gpt-5.5",
            sandboxProvider: "docker",
            branch: null,
            maxIterations: null,
            startedAt: new Date("2026-05-02T20:01:00.000Z"),
            endedAt: new Date("2026-05-02T20:07:00.000Z"),
            status: "canceled",
            cancelRequested: true,
            completionSignal: null,
            configSnapshot: {},
            errorMessage: null,
          },
          {
            id: "00000000-0000-4000-8000-000000000032",
            jobId,
            taskId: null,
            name: "reviewer",
            agentProvider: "claudeCode",
            agentModel: "claude-opus-4-6",
            sandboxProvider: "docker",
            branch: null,
            maxIterations: null,
            startedAt: new Date("2026-05-02T20:03:00.000Z"),
            endedAt: new Date("2026-05-02T20:09:00.000Z"),
            status: "running",
            cancelRequested: false,
            completionSignal: null,
            configSnapshot: {},
            errorMessage: null,
          },
        ]}
        tasks={[]}
      />,
    );

    expect(markup).toContain("Run name");
    expect(markup).toContain("worker");
    expect(markup).toContain("reviewer");
    expect(markup).toContain(
      'href="/runs/00000000-0000-4000-8000-000000000031"',
    );
    expect(markup).toContain("bg-st-canceled");
    expect(markup).toContain("bg-st-running");
  });

  it("renders the rebuilt multi-iteration Run detail page", () => {
    const run: ComponentProps<typeof RunDetailPage>["run"] = {
      id: runId,
      jobId,
      taskId: "00000000-0000-4000-8000-000000000011",
      name: "planner",
      agentProvider: "claudeCode",
      agentModel: "claude-opus-4-6",
      sandboxProvider: "docker",
      branch: null,
      maxIterations: 2,
      startedAt,
      endedAt,
      status: "completed",
      cancelRequested: false,
      completionSignal: "<promise>COMPLETE</promise>",
      configSnapshot: {},
      errorMessage: null,
    };
    const firstIterationId = "00000000-0000-4000-8000-000000000006";
    const secondIterationId = "00000000-0000-4000-8000-000000000007";

    const markup = renderToStaticMarkup(
      <RunDetailPage
        activeIterationNumber={2}
        events={[
          {
            id: "00000000-0000-4000-8000-000000000008",
            sequenceNumber: 1,
            runId,
            iterationId: firstIterationId,
            type: "text",
            payload: { message: "planning" },
            timestamp: startedAt,
          },
          {
            id: "00000000-0000-4000-8000-000000000009",
            sequenceNumber: 2,
            runId,
            iterationId: secondIterationId,
            type: "toolCall",
            payload: { name: "Bash", formattedArgs: "bun run check" },
            timestamp: endedAt,
          },
          {
            id: "00000000-0000-4000-8000-000000000010",
            sequenceNumber: 3,
            runId,
            iterationId: secondIterationId,
            type: "text",
            payload: { message: "repairing tests" },
            timestamp: endedAt,
          },
        ]}
        iterations={[
          {
            id: firstIterationId,
            runId,
            n: 1,
            startedAt,
            endedAt,
            inputTokens: 100,
            outputTokens: 25,
            cacheReadInputTokens: 10,
            cacheCreationInputTokens: 5,
            sessionId: null,
            sessionFilePath: null,
          },
          {
            id: secondIterationId,
            runId,
            n: 2,
            startedAt,
            endedAt,
            inputTokens: 200,
            outputTokens: 50,
            cacheReadInputTokens: 20,
            cacheCreationInputTokens: 10,
            sessionId: null,
            sessionFilePath: null,
          },
        ]}
        job={{
          id: jobId,
          projectId,
          startedAt,
          endedAt,
          status: "completed",
          processPid: null,
          watchtowerVersion: null,
          title: "fix: Dashboard Job title",
          template: null,
        }}
        run={run}
        task={{
          id: "00000000-0000-4000-8000-000000000011",
          jobId,
          externalId: "21",
          title: "Run detail rebuild",
          branch: "sandcastle/issue-21-run-detail-rebuild",
          status: "in_progress",
          failureCount: 0,
          createdAt: startedAt,
        }}
      />,
    );

    expect(markup).toContain("RUN · r_000000");
    expect(markup).toContain("Run detail rebuild");
    expect(markup).toContain("iteration 2 / 2");
    expect(markup).toContain("· turn 2");
    expect(markup).toContain("Started");
    expect(markup).toContain("Copy logs");
    expect(markup).toContain("Compare to last");
    expect(markup).toContain("iteration 1");
    expect(markup).toContain("iteration 2");
    expect(markup).toContain('data-active="true"');
    expect(markup).toContain("Event timeline");
    expect(markup).toContain("Auto-scroll");
    expect(markup).toContain("#01");
    expect(markup).toContain("turn 1");
    expect(markup).toContain("Bash bun run check");
    expect(markup).toContain("repairing tests");
    expect(markup).toContain("Run metadata");
    expect(markup).toContain("This iteration");
    expect(markup).toContain("Tools used");
    expect(markup).toContain("cost");
    expect(markup).toContain("$0.00");
    expect(markup).not.toContain("Token usage");
    expect(markup).not.toContain("Run total");
    expect(markup).not.toContain("Cancel");
  });

  it("renders one-shot Run chrome and Codex cost fallback", () => {
    const run: ComponentProps<typeof RunDetailPage>["run"] = {
      id: runId,
      jobId,
      taskId: null,
      name: "implementer",
      agentProvider: "codex",
      agentModel: "gpt-5.5",
      sandboxProvider: "docker",
      branch: null,
      maxIterations: 1,
      startedAt,
      endedAt,
      status: "completed",
      cancelRequested: false,
      completionSignal: null,
      configSnapshot: {},
      errorMessage: null,
    };

    const markup = renderToStaticMarkup(
      <RunDetailPage
        events={[]}
        iterations={[
          {
            id: "00000000-0000-4000-8000-000000000010",
            runId,
            n: 1,
            startedAt,
            endedAt,
            inputTokens: null,
            outputTokens: null,
            cacheReadInputTokens: null,
            cacheCreationInputTokens: null,
            sessionId: null,
            sessionFilePath: null,
          },
        ]}
        job={null}
        run={run}
        task={null}
      />,
    );

    expect(markup).toContain("iteration 1");
    expect(markup).toContain("—");
    expect(markup).not.toContain('href="?iter=');
    expect(markup).not.toContain("Token usage");
  });

  it("renders Job Tasks and Runs cards side-by-side", () => {
    const taskId = "00000000-0000-4000-8000-000000000011";
    const markup = renderToStaticMarkup(
      <JobDetailPage
        job={{
          id: jobId,
          projectId,
          startedAt,
          endedAt: new Date("2026-05-02T20:04:00.000Z"),
          status: "completed",
          processPid: null,
          watchtowerVersion: null,
          title: null,
          template: null,
        }}
        runs={[
          {
            id: runId,
            jobId,
            taskId,
            name: "reviewer",
            agentProvider: "claudeCode",
            agentModel: "claude-opus-4-6",
            sandboxProvider: "docker",
            branch: "sandcastle/issue-20-job-detail-cancel-endpoint",
            maxIterations: 3,
            startedAt,
            endedAt,
            status: "failed",
            cancelRequested: false,
            completionSignal: null,
            configSnapshot: {},
            errorMessage: null,
          },
        ]}
        tasks={[
          {
            id: taskId,
            jobId,
            externalId: "20",
            title: "Job cards",
            branch: "sandcastle/issue-20-job-detail-cancel-endpoint",
            status: "failed",
            failureCount: 1,
            createdAt: startedAt,
          },
        ]}
      />,
    );

    expect(markup).toContain("grid gap-3 xl:grid-cols-2");
    expect(markup).toContain(">#</th>");
    expect(markup).toContain(">Title</th>");
    expect(markup).toContain(">Branch</th>");
    expect(markup).toContain(">Runs</th>");
    expect(markup).toContain(">Name</th>");
    expect(markup).toContain(">Task</th>");
    expect(markup).toContain(">Iters</th>");
    expect(markup).toContain(">Dur</th>");
    expect(markup).not.toContain("Cancel job");
  });
});
