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
      },
      runs: [
        {
          id: runId,
          jobId,
          taskId: null,
          name: "implementer",
          agentProvider: "codex",
          agentModel: "gpt-5.5",
          sandboxProvider: "docker",
          branch: null,
          maxIterations: null,
          startedAt,
          endedAt: null,
          status: "running",
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
    expect(markup).toContain("completed");
    expect(markup).toContain("140");
    expect(markup).toContain("implementer");
    expect(markup).toContain("codex / gpt-5.5");
    expect(markup).toContain("docker");
    expect(markup).toContain("running");
    expect(markup).toContain("checking status");
    expect(markup).toContain("Bash bun test");
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
});
