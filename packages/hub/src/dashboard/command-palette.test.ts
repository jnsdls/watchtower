import { describe, expect, it } from "vitest";
import {
  buildCommandPaletteModel,
  type CommandPaletteSnapshot,
  getNextCommandPaletteIndex,
} from "./command-palette-data";

const snapshot: CommandPaletteSnapshot = {
  projects: [
    {
      id: "project-1",
      displayName: "watchtower",
      gitRemoteUrl: "git@github.com:jnsdls/watchtower.git",
      localPath: null,
      createdAt: "2026-05-02T20:00:00.000Z",
    },
  ],
  jobs: [
    {
      id: "job-1",
      projectId: "project-1",
      title: "fix: command palette",
      startedAt: "2026-05-02T20:00:00.000Z",
      endedAt: null,
      status: "running",
    },
  ],
  tasks: [
    {
      id: "task-1",
      jobId: "job-1",
      title: "Cancel running Job",
      branch: "sandcastle/issue-22-cmdk-command-palette",
      externalId: "22",
      status: "in_progress",
      failureCount: 0,
      createdAt: "2026-05-02T20:00:00.000Z",
    },
  ],
  runs: [
    {
      id: "run-1",
      jobId: "job-1",
      taskId: "task-1",
      name: "implementer",
      branch: null,
      startedAt: "2026-05-02T20:02:00.000Z",
      endedAt: null,
      status: "running",
      agentProvider: "codex",
      agentModel: "gpt-5.5",
      sandboxProvider: "docker",
      maxIterations: null,
      cancelRequested: false,
      completionSignal: null,
      configSnapshot: {},
      errorMessage: null,
    },
    {
      id: "run-2",
      jobId: "job-1",
      taskId: null,
      name: "planner",
      branch: "main",
      startedAt: "2026-05-02T20:01:00.000Z",
      endedAt: "2026-05-02T20:03:00.000Z",
      status: "completed",
      agentProvider: "claudeCode",
      agentModel: null,
      sandboxProvider: "docker",
      maxIterations: null,
      cancelRequested: false,
      completionSignal: null,
      configSnapshot: {},
      errorMessage: null,
    },
  ],
};

describe("command palette data", () => {
  it("filters runs and jobs across branch, Job title, Run name, and Task title", () => {
    const model = buildCommandPaletteModel(snapshot, {
      pathname: "/jobs/job-1",
      query: "cancel",
      now: new Date("2026-05-02T20:05:00.000Z"),
    });

    expect(model.runItems).toMatchObject([
      {
        id: "run-1",
        href: "/runs/run-1",
        text: "implementer · Cancel running Job",
      },
    ]);
    expect(model.jobItems).toMatchObject([
      {
        id: "job-1",
        href: "/jobs/job-1",
        text: "fix: command palette",
      },
    ]);
    expect(model.runMatchCount).toBe(1);
    expect(model.totalRunCount).toBe(2);
  });

  it("exposes the cancel action only for a Job or Run page with a running Run", () => {
    expect(
      buildCommandPaletteModel(snapshot, {
        pathname: "/runs/run-1",
        query: "",
        now: new Date("2026-05-02T20:05:00.000Z"),
      }).actionItems,
    ).toMatchObject([
      {
        id: "cancel-job-1",
        jobId: "job-1",
        text: "Cancel running Job",
      },
    ]);
    expect(
      buildCommandPaletteModel(snapshot, {
        pathname: "/projects/project-1",
        query: "",
        now: new Date("2026-05-02T20:05:00.000Z"),
      }).actionItems,
    ).toEqual([]);
  });

  it("cycles keyboard navigation across visible items", () => {
    expect(getNextCommandPaletteIndex(0, 4, 1)).toBe(1);
    expect(getNextCommandPaletteIndex(3, 4, 1)).toBe(0);
    expect(getNextCommandPaletteIndex(0, 4, -1)).toBe(3);
    expect(getNextCommandPaletteIndex(0, 0, 1)).toBe(-1);
  });
});
