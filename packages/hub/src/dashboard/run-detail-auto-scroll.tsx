"use client";

import { ArrowDownToLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { autoScrollStateAfterScroll, isNearBottom } from "./run-detail-state";

export function AutoScrollTimeline({
  children,
  defaultEnabled,
  eventCount,
}: {
  children: React.ReactNode;
  defaultEnabled: boolean;
  eventCount: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setEnabled(defaultEnabled);
    setPaused(false);
  }, [defaultEnabled]);

  useEffect(() => {
    void eventCount;

    if (!enabled || paused) {
      return;
    }

    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [enabled, paused, eventCount]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium text-fg text-sm">Event timeline</h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted">
            {eventCount} events · grouped by Turn
          </span>
          <Button
            aria-pressed={enabled && !paused}
            onClick={() => {
              setEnabled(true);
              setPaused(false);
              bottomRef.current?.scrollIntoView({ block: "end" });
            }}
            type="button"
            variant="ghost"
          >
            <ArrowDownToLine aria-hidden="true" className="size-4" />
            Auto-scroll
            <span
              aria-hidden="true"
              className={
                enabled && !paused
                  ? "size-1.5 rounded-full bg-st-running"
                  : "size-1.5 rounded-full bg-muted"
              }
            />
          </Button>
        </div>
      </div>
      <div
        className="max-h-[calc(100vh-18rem)] overflow-y-auto pr-1"
        onScroll={(event) => {
          const target = event.currentTarget;
          const next = autoScrollStateAfterScroll({
            clientHeight: target.clientHeight,
            enabled,
            scrollHeight: target.scrollHeight,
            scrollTop: target.scrollTop,
          });

          setEnabled(next.enabled);
          setPaused(next.paused);
        }}
        ref={containerRef}
      >
        {children}
        <div
          aria-hidden="true"
          ref={bottomRef}
          data-at-bottom={
            containerRef.current ? isNearBottom(containerRef.current) : true
          }
        />
      </div>
    </div>
  );
}
