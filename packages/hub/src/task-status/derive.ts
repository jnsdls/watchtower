// Task status derives from the runs linked to it. The status reflects the
// *current attempt* — the most recent contiguous batch of runs with no idle
// gap between them. An "idle gap" is any moment when no linked run was
// in-flight; when a new run starts after such a gap, it opens a fresh attempt
// and earlier failures no longer affect status.
//
// failure_count (handled separately, not here) is cumulative across all
// attempts and is what preserves the historical "this task has been retried"
// signal.

export type RunForTaskStatus = {
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly status: string;
};

export type DerivedTaskStatus =
  | "pending"
  | "in_progress"
  | "succeeded"
  | "failed";

const isInFlight = (run: RunForTaskStatus) =>
  run.endedAt === null || run.status === "running";

export const deriveTaskStatusFromRuns = (
  runs: ReadonlyArray<RunForTaskStatus>,
): DerivedTaskStatus => {
  if (runs.length === 0) {
    return "pending";
  }

  const sorted = [...runs].sort(
    (left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
  );

  // Group runs into attempts. A new attempt begins when a run starts after
  // the latest endedAt of all earlier runs (i.e. nothing was in-flight at
  // that moment). An in-flight run extends the current attempt indefinitely.
  let currentAttempt: RunForTaskStatus[] = [];
  let attemptEnd: number = Number.NEGATIVE_INFINITY;

  for (const run of sorted) {
    const startMs = run.startedAt.getTime();
    if (currentAttempt.length > 0 && startMs > attemptEnd) {
      currentAttempt = [run];
    } else {
      currentAttempt.push(run);
    }
    attemptEnd = isInFlight(run)
      ? Number.POSITIVE_INFINITY
      : Math.max(attemptEnd, run.endedAt?.getTime() ?? attemptEnd);
  }

  if (currentAttempt.some(isInFlight)) {
    return "in_progress";
  }

  if (currentAttempt.every((run) => run.status === "succeeded")) {
    return "succeeded";
  }

  return "failed";
};
