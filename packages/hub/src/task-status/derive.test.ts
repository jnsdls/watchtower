import { describe, expect, it } from "vitest";
import {
  type DerivedTaskStatus,
  deriveTaskStatusFromRuns,
  type RunForTaskStatus,
} from "./derive";

const at = (iso: string) => new Date(iso);

const run = (
  startedAt: string,
  endedAt: string | null,
  status: string,
): RunForTaskStatus => ({
  startedAt: at(startedAt),
  endedAt: endedAt ? at(endedAt) : null,
  status,
});

const cases: Array<{
  name: string;
  runs: RunForTaskStatus[];
  expected: DerivedTaskStatus;
}> = [
  {
    name: "no runs → pending",
    runs: [],
    expected: "pending",
  },
  {
    name: "single in-flight run → in_progress",
    runs: [run("2026-05-02T20:01:00Z", null, "running")],
    expected: "in_progress",
  },
  {
    name: "single succeeded run → succeeded",
    runs: [run("2026-05-02T20:01:00Z", "2026-05-02T20:05:00Z", "succeeded")],
    expected: "succeeded",
  },
  {
    name: "single failed run → failed",
    runs: [run("2026-05-02T20:01:00Z", "2026-05-02T20:05:00Z", "failed")],
    expected: "failed",
  },
  {
    name: "implementer succeeded + reviewer succeeded (sequential) → succeeded",
    runs: [
      run("2026-05-02T20:01:00Z", "2026-05-02T20:05:00Z", "succeeded"),
      run("2026-05-02T20:06:00Z", "2026-05-02T20:08:00Z", "succeeded"),
    ],
    expected: "succeeded",
  },
  {
    name: "implementer succeeded + reviewer failed → failed",
    runs: [
      run("2026-05-02T20:01:00Z", "2026-05-02T20:05:00Z", "succeeded"),
      run("2026-05-02T20:06:00Z", "2026-05-02T20:08:00Z", "failed"),
    ],
    expected: "failed",
  },
  {
    name: "implementer succeeded + reviewer in-flight → in_progress",
    runs: [
      run("2026-05-02T20:01:00Z", "2026-05-02T20:05:00Z", "succeeded"),
      run("2026-05-02T20:06:00Z", null, "running"),
    ],
    expected: "in_progress",
  },
  {
    name: "overlapping runs (parallel within attempt) all succeeded → succeeded",
    runs: [
      run("2026-05-02T20:01:00Z", "2026-05-02T20:05:00Z", "succeeded"),
      run("2026-05-02T20:02:00Z", "2026-05-02T20:06:00Z", "succeeded"),
    ],
    expected: "succeeded",
  },
  {
    name: "attempt 1 failed + attempt 2 in-flight → in_progress (failure not sticky)",
    runs: [
      run("2026-05-02T20:01:00Z", "2026-05-02T20:02:00Z", "failed"),
      run("2026-05-02T20:30:00Z", null, "running"),
    ],
    expected: "in_progress",
  },
  {
    name: "attempt 1 failed + attempt 2 succeeded → succeeded",
    runs: [
      run("2026-05-02T20:01:00Z", "2026-05-02T20:02:00Z", "failed"),
      run("2026-05-02T20:30:00Z", "2026-05-02T20:35:00Z", "succeeded"),
    ],
    expected: "succeeded",
  },
  {
    name: "attempt 1 succeeded + attempt 2 failed → failed (latest attempt wins)",
    runs: [
      run("2026-05-02T20:01:00Z", "2026-05-02T20:02:00Z", "succeeded"),
      run("2026-05-02T20:30:00Z", "2026-05-02T20:35:00Z", "failed"),
    ],
    expected: "failed",
  },
  {
    name: "attempt 1 (impl-succ + reviewer-fail) then attempt 2 (impl-succ + reviewer-succ) → succeeded",
    runs: [
      run("2026-05-02T20:01:00Z", "2026-05-02T20:05:00Z", "succeeded"),
      run("2026-05-02T20:06:00Z", "2026-05-02T20:08:00Z", "failed"),
      run("2026-05-02T20:30:00Z", "2026-05-02T20:35:00Z", "succeeded"),
      run("2026-05-02T20:36:00Z", "2026-05-02T20:38:00Z", "succeeded"),
    ],
    expected: "succeeded",
  },
  {
    name: "in-flight run extends attempt across what would otherwise be a gap",
    runs: [
      run("2026-05-02T20:01:00Z", null, "running"),
      run("2026-05-02T20:30:00Z", null, "running"),
    ],
    expected: "in_progress",
  },
  {
    name: "canceled is treated as not-succeeded → failed",
    runs: [run("2026-05-02T20:01:00Z", "2026-05-02T20:02:00Z", "canceled")],
    expected: "failed",
  },
  {
    name: "out-of-order input still groups by chronological start",
    runs: [
      run("2026-05-02T20:30:00Z", "2026-05-02T20:35:00Z", "succeeded"),
      run("2026-05-02T20:01:00Z", "2026-05-02T20:02:00Z", "failed"),
    ],
    expected: "succeeded",
  },
];

describe("deriveTaskStatusFromRuns", () => {
  for (const { name, runs, expected } of cases) {
    it(name, () => {
      expect(deriveTaskStatusFromRuns(runs)).toBe(expected);
    });
  }
});
