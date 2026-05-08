import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildBreadcrumbs, buildHubBadge } from "./app-shell-data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/project-1/jobs/job-2/runs/run-3",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("./theme/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">theme toggle</button>,
}));

describe("App shell", () => {
  it("builds route-driven breadcrumbs", () => {
    expect(buildBreadcrumbs("/")).toEqual(["Projects"]);
    expect(buildBreadcrumbs("/projects/project-1")).toEqual([
      "Projects",
      "project-1",
    ]);
    expect(buildBreadcrumbs("/jobs/job-2")).toEqual(["Jobs", "job-2"]);
    expect(buildBreadcrumbs("/runs/run-3")).toEqual(["Runs", "run-3"]);
  });

  it("builds a local pglite Hub badge from env", () => {
    expect(
      buildHubBadge({
        HOSTNAME: "127.0.0.1",
        WATCHTOWER_PORT: "7788",
      }),
    ).toBe("local · :7788 · pglite");
    expect(buildHubBadge({ HOSTNAME: "0.0.0.0", PORT: "7777" })).toBe(
      "local · 0.0.0.0:7777 · pglite",
    );
  });

  it("renders logo, Hub badge, breadcrumbs, search hint, and theme toggle", async () => {
    const { AppShell } = await import("./app-shell");
    const markup = renderToStaticMarkup(
      <AppShell hubBadge="local · :7777 · pglite">
        <FakeChild />
      </AppShell>,
    );

    expect(markup).toContain("watchtower");
    expect(markup).toContain("local · :7777 · pglite");
    expect(markup).toContain("project-1");
    expect(markup).toContain("job-2");
    expect(markup).toContain("run-3");
    expect(markup).toContain("Search Projects, Jobs, Runs");
    expect(markup).toContain("⌘");
    expect(markup).toContain("K");
    expect(markup).toContain("theme toggle");
    expect(markup).toContain("content");
  });
});

function FakeChild({ children }: { children?: ReactNode }) {
  return <main>{children ?? "content"}</main>;
}
