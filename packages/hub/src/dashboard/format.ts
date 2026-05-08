export const formatDateTime = (date: Date | null) => {
  if (!date) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
};

export const formatRelativeTime = (date: Date | null, now = new Date()) => {
  if (!date) {
    return "n/a";
  }

  const diffSeconds = Math.max(
    0,
    Math.round((now.getTime() - date.getTime()) / 1000),
  );
  const units = [
    ["d", 86_400],
    ["h", 3_600],
    ["m", 60],
  ] as const;

  for (const [label, secondsPerUnit] of units) {
    if (diffSeconds >= secondsPerUnit) {
      return `${Math.floor(diffSeconds / secondsPerUnit)}${label} ago`;
    }
  }

  return "just now";
};

export const formatDuration = (startedAt: Date, endedAt: Date | null) => {
  if (!endedAt) {
    return "running";
  }

  const totalSeconds = Math.max(
    0,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

export const formatTokens = (totalTokens: number | null) =>
  totalTokens === null
    ? "n/a"
    : new Intl.NumberFormat("en").format(totalTokens);
