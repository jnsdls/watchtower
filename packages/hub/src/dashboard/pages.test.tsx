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
        },
      ],
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
    expect(markup).toContain("codex / gpt-5.5");
    expect(markup).toContain("docker");
    expect(markup).toContain("running");
    expect(markup).toContain("Cancel");
    expect(markup).toContain("checking status");
    expect(markup).toContain("Bash bun test");
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

  it("renders iteration boundaries and token usage on the Run detail page", () => {
    const run: ComponentProps<typeof RunDetailPage>["run"] = {
      id: runId,
      jobId,
      taskId: null,
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
        run={run}
      />,
    );

    expect(markup).toContain("Iteration 1/2");
    expect(markup).toContain("Iteration 2/2");
    expect(markup).toContain("Run total");
    expect(markup).toContain("300");
    expect(markup).toContain("75");
    expect(markup).toContain("30");
    expect(markup).toContain("15");
    expect(markup).toContain("Bash bun run check");
    expect(markup).not.toContain("Cancel");
  });

  it("renders n/a for Run token usage when iteration usage is unavailable", () => {
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
        run={run}
      />,
    );

    expect(markup).toContain("Run total");
    expect(markup.match(/n\/a/g)?.length).toBeGreaterThanOrEqual(5);
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
