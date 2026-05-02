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
