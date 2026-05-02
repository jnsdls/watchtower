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

    source.addEventListener("event", () => {
      if (refreshTimer.current) {
        return;
      }

      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = undefined;
        router.refresh();
      }, refreshDelayMs);
    });

    return () => {
      source.close();

      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, [router]);

  return null;
}
