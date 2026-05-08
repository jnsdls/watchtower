import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Kbd, LiveDuration, Mono, Num, StatusPill } from "./primitives";

describe("Dashboard primitives", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports status, mono, number, and keyboard primitives", () => {
    const markup = renderToStaticMarkup(
      <>
        <StatusPill status="running" />
        <StatusPill status="succeeded">done</StatusPill>
        <Mono>run_123</Mono>
        <Num>42</Num>
        <Kbd>K</Kbd>
      </>,
    );

    expect(markup).toContain('data-status="running"');
    expect(markup).toContain('data-status="succeeded"');
    expect(markup).toContain("done");
    expect(markup).toContain("font-mono");
    expect(markup).toContain("tabular-nums");
    expect(markup).toContain("K");
  });

  it("renders live elapsed time and stops when ended", () => {
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(new Date("2026-05-02T20:00:00.000Z").getTime());
    const startedAt = new Date("2026-05-02T19:59:57.000Z");

    expect(renderToStaticMarkup(<LiveDuration startedAt={startedAt} />)).toBe(
      '<span class="font-mono tabular-nums">00:03</span>',
    );

    now.mockReturnValue(new Date("2026-05-02T20:00:02.000Z").getTime());
    expect(renderToStaticMarkup(<LiveDuration startedAt={startedAt} />)).toBe(
      '<span class="font-mono tabular-nums">00:05</span>',
    );

    expect(
      renderToStaticMarkup(
        <LiveDuration
          endedAt={new Date("2026-05-02T20:00:04.000Z")}
          startedAt={startedAt}
        />,
      ),
    ).toBe('<span class="font-mono tabular-nums">00:07</span>');

    now.mockReturnValue(new Date("2026-05-02T20:00:09.000Z").getTime());
    expect(
      renderToStaticMarkup(
        <LiveDuration
          endedAt={new Date("2026-05-02T20:00:04.000Z")}
          startedAt={startedAt}
        />,
      ),
    ).toBe('<span class="font-mono tabular-nums">00:07</span>');
  });
});
