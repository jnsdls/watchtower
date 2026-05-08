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

    expect(markup).toContain("Run timeline");
    expect(markup).toContain("Swimlanes by Task");
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

    expect(markup).toContain("Swimlanes by Run name");
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
});
