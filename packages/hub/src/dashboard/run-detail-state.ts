import type {
  getRun,
  listEventsForRun,
  listIterationsForRun,
} from "../db/queries";

export type RunDetailRun = NonNullable<Awaited<ReturnType<typeof getRun>>>;
export type RunDetailEvent = Awaited<
  ReturnType<typeof listEventsForRun>
>[number];
export type RunDetailIterationRow = Awaited<
  ReturnType<typeof listIterationsForRun>
>[number];
export type RunDetailStatus = "running" | "succeeded" | "failed" | "canceled";

type TokenMetricKey =
  | "inputTokens"
  | "outputTokens"
  | "cacheReadInputTokens"
  | "cacheCreationInputTokens";

export type RunDetailIteration = {
  id: string;
  n: number;
  startedAt: Date;
  endedAt: Date | null;
  status: RunDetailStatus;
  turnCount: number;
  eventCount: number;
  toolCount: number;
  tokenTotal: number | null;
  row: RunDetailIterationRow | null;
  events: RunDetailEvent[];
};

export type RunDetailTurn = {
  n: number;
  startedAt: Date | null;
  endedAt: Date | null;
  events: RunDetailEvent[];
};

export type RunDetailState = {
  activeIteration: RunDetailIteration;
  activeIterationNumber: number;
  isMultiIteration: boolean;
  iterations: RunDetailIteration[];
  turns: RunDetailTurn[];
  toolsUsed: { name: string; count: number; ratio: number }[];
};

const tokenMetrics: TokenMetricKey[] = [
  "inputTokens",
  "outputTokens",
  "cacheReadInputTokens",
  "cacheCreationInputTokens",
];

const statusValue = (status: string): RunDetailStatus => {
  if (status === "completed") {
    return "succeeded";
  }

  if (
    status === "running" ||
    status === "succeeded" ||
    status === "failed" ||
    status === "canceled"
  ) {
    return status;
  }

  return "failed";
};

const payloadIterationNumber = (event: RunDetailEvent) => {
  const payload = event.payload as { iteration?: unknown };
  return typeof payload.iteration === "number" ? payload.iteration : null;
};

const eventToolName = (event: RunDetailEvent) => {
  const payload = event.payload as { name?: unknown };
  return typeof payload.name === "string" && payload.name.length > 0
    ? payload.name
    : "tool";
};

const sumNonNull = (values: (number | null)[]) => {
  let total: number | null = null;

  for (const value of values) {
    if (value !== null) {
      total = (total ?? 0) + value;
    }
  }

  return total;
};

const tokenTotal = (iteration: RunDetailIterationRow | null) =>
  iteration
    ? sumNonNull(tokenMetrics.map((metric) => iteration[metric]))
    : null;

const inferIterationNumbers = (
  iterations: RunDetailIterationRow[],
  events: RunDetailEvent[],
) => {
  const numbers = new Set<number>();

  for (const iteration of iterations) {
    numbers.add(iteration.n);
  }

  for (const event of events) {
    const n = payloadIterationNumber(event);
    if (n !== null) {
      numbers.add(n);
    }
  }

  const maxObserved = Math.max(...numbers, iterations.length, 1);

  for (let n = 1; n <= maxObserved; n += 1) {
    numbers.add(n);
  }

  return [...numbers].sort((left, right) => left - right);
};

const eventsForIteration = ({
  eventIterationIdByNumber,
  events,
  iteration,
  totalIterations,
}: {
  eventIterationIdByNumber: Map<number, string>;
  events: RunDetailEvent[];
  iteration: { id: string; n: number };
  totalIterations: number;
}) =>
  events.filter((event) => {
    if (event.iterationId) {
      return event.iterationId === iteration.id;
    }

    const payloadN = payloadIterationNumber(event);
    if (payloadN !== null) {
      return payloadN === iteration.n;
    }

    if (eventIterationIdByNumber.has(iteration.n)) {
      return false;
    }

    return totalIterations === 1 && iteration.n === 1;
  });

export const groupEventsByTurn = (
  events: RunDetailEvent[],
): RunDetailTurn[] => {
  const turns: RunDetailTurn[] = [];

  for (const event of events) {
    if (event.type === "text" || turns.length === 0) {
      turns.push({
        n: turns.length + 1,
        startedAt: event.timestamp,
        endedAt: event.timestamp,
        events: [event],
      });
      continue;
    }

    const turn = turns.at(-1);
    if (turn) {
      turn.events.push(event);
      turn.endedAt = event.timestamp;
    }
  }

  return turns;
};

const topToolsUsed = (events: RunDetailEvent[]) => {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.type !== "toolCall") {
      continue;
    }

    const name = eventToolName(event);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const max = Math.max(1, ...counts.values());

  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, ratio: count / max }));
};

export const buildRunDetailState = ({
  activeIterationNumber,
  events,
  iterations,
  run,
}: {
  activeIterationNumber?: number | null;
  events: RunDetailEvent[];
  iterations: RunDetailIterationRow[];
  run: RunDetailRun;
}): RunDetailState => {
  const iterationNumbers = inferIterationNumbers(iterations, events);
  const iterationRowsByNumber = new Map(
    iterations.map((iteration) => [iteration.n, iteration]),
  );
  const eventIterationIdByNumber = new Map(
    iterations.map((iteration) => [iteration.n, iteration.id]),
  );
  const lastIterationNumber = iterationNumbers.at(-1) ?? 1;
  const totalIterations = iterationNumbers.length;

  const detailIterations = iterationNumbers.map<RunDetailIteration>((n) => {
    const row = iterationRowsByNumber.get(n) ?? null;
    const iterationEvents = eventsForIteration({
      eventIterationIdByNumber,
      events,
      iteration: { id: row?.id ?? `derived-${n}`, n },
      totalIterations,
    });
    const turns = groupEventsByTurn(iterationEvents);

    return {
      id: row?.id ?? `derived-${n}`,
      n,
      startedAt:
        row?.startedAt ?? iterationEvents[0]?.timestamp ?? run.startedAt,
      endedAt:
        row?.endedAt ??
        iterationEvents.at(-1)?.timestamp ??
        (n === lastIterationNumber ? run.endedAt : null),
      status: n === lastIterationNumber ? statusValue(run.status) : "failed",
      turnCount: turns.length,
      eventCount: iterationEvents.length,
      toolCount: iterationEvents.filter((event) => event.type === "toolCall")
        .length,
      tokenTotal: tokenTotal(row),
      row,
      events: iterationEvents,
    };
  });

  const requestedIteration =
    activeIterationNumber &&
    detailIterations.some((iteration) => iteration.n === activeIterationNumber)
      ? activeIterationNumber
      : lastIterationNumber;
  const activeIteration =
    detailIterations.find((iteration) => iteration.n === requestedIteration) ??
    detailIterations.at(-1) ??
    detailIterations[0];

  if (!activeIteration) {
    throw new Error("Expected at least one Run iteration");
  }

  const turns = groupEventsByTurn(activeIteration.events);

  return {
    activeIteration,
    activeIterationNumber: activeIteration.n,
    isMultiIteration: detailIterations.length > 1,
    iterations: detailIterations,
    turns,
    toolsUsed: topToolsUsed(activeIteration.events),
  };
};

export const isNearBottom = ({
  clientHeight,
  scrollHeight,
  scrollTop,
}: {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}) => scrollHeight - scrollTop - clientHeight <= 8;

export const autoScrollStateAfterScroll = (position: {
  enabled: boolean;
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}) => {
  if (isNearBottom(position)) {
    return { enabled: true, paused: false };
  }

  if (position.enabled) {
    return { enabled: false, paused: true };
  }

  return { enabled: position.enabled, paused: true };
};
