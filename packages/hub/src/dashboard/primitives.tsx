"use client";

import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

export type StatusPillStatus = "running" | "succeeded" | "failed" | "canceled";

export function StatusPill({
  status,
  children,
  className,
}: {
  status: StatusPillStatus;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full border px-2 font-medium text-[11px] capitalize",
        status === "running" &&
          "border-st-running-bd bg-st-running-bg text-st-running",
        status === "succeeded" &&
          "border-st-succeeded-bd bg-st-succeeded-bg text-st-succeeded",
        status === "failed" &&
          "border-st-failed-bd bg-st-failed-bg text-st-failed",
        status === "canceled" &&
          "border-st-canceled-bd bg-st-canceled-bg text-st-canceled",
        className,
      )}
      data-status={status}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          status === "running" && "animate-wt-pulse bg-st-running",
          status === "succeeded" && "bg-st-succeeded",
          status === "failed" && "bg-st-failed",
          status === "canceled" && "bg-st-canceled",
        )}
      />
      {children ?? status}
    </span>
  );
}

export function Mono({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("font-mono", className)} {...props} />;
}

export function Num({ className, ...props }: ComponentProps<"span">) {
  return (
    <span className={cn("font-mono tabular-nums", className)} {...props} />
  );
}

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-border border-b-2 bg-card-soft px-1.5 font-mono text-[11px] text-fg-soft leading-none",
        className,
      )}
      {...props}
    />
  );
}

const toDate = (value: Date | string) =>
  value instanceof Date ? value : new Date(value);

const elapsedSeconds = (
  startedAt: Date | string,
  endedAt?: Date | string | null,
) => {
  const start = toDate(startedAt).getTime();
  const end = endedAt ? toDate(endedAt).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
};

const formatElapsed = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
};

export function LiveDuration({
  startedAt,
  endedAt = null,
  className,
}: {
  startedAt: Date | string;
  endedAt?: Date | string | null;
  className?: string;
}) {
  const [seconds, setSeconds] = useState(() =>
    elapsedSeconds(startedAt, endedAt),
  );

  useEffect(() => {
    setSeconds(elapsedSeconds(startedAt, endedAt));

    if (endedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setSeconds(elapsedSeconds(startedAt, null));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [startedAt, endedAt]);

  return <Num className={className}>{formatElapsed(seconds)}</Num>;
}
