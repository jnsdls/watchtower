"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const refreshDelayMs = 250;

export function LiveUpdates() {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    const source = new EventSource("/api/stream");

    const scheduleRefresh = () => {
      if (refreshTimer.current) {
        return;
      }

      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = undefined;
        router.refresh();
      }, refreshDelayMs);
    };

    // `event` carries persisted stream Events (text / toolCall).
    // `tick` is a payload-less pulse fired when lifecycle telemetry
    // (run.started/completed, job.*, planner.output) mutated DB state
    // without producing a stream Event. Both should refresh the page.
    source.addEventListener("event", scheduleRefresh);
    source.addEventListener("tick", scheduleRefresh);

    return () => {
      source.close();

      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, [router]);

  return null;
}
