"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildBreadcrumbs } from "./app-shell-data";
import { Kbd, Mono } from "./primitives";
import { ThemeToggle } from "./theme/theme-toggle";

export function TopBar({ hubBadge }: { hubBadge: string }) {
  const pathname = usePathname() ?? "/";
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-border border-b bg-bg-elev px-4">
      <Link
        className="inline-flex items-center gap-2 font-semibold text-fg text-sm"
        href="/"
      >
        <span
          aria-hidden="true"
          className="grid size-[18px] place-items-center rounded-[5px] border border-border bg-card-soft"
        >
          <span className="size-2 rounded-full bg-accent" />
        </span>
        watchtower
      </Link>

      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-st-succeeded"
        />
        <Mono className="text-[11px] text-muted">{hubBadge}</Mono>
      </span>

      <nav
        aria-label="Breadcrumb"
        className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex"
      >
        {breadcrumbs.map((crumb, index) => (
          <span
            className="inline-flex min-w-0 items-center gap-1.5"
            key={crumb}
          >
            {index > 0 ? <span className="text-muted-2">/</span> : null}
            <span
              className={
                index === breadcrumbs.length - 1
                  ? "truncate font-medium text-fg"
                  : "truncate text-muted"
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      <button
        className="hidden h-[26px] min-w-[220px] items-center gap-2 rounded-md border border-border bg-card px-2 text-muted text-xs transition-colors hover:border-border-strong hover:bg-hover hover:text-fg md:inline-flex"
        onClick={() => undefined}
        type="button"
      >
        <Search aria-hidden="true" className="size-3.5" />
        <span>Search Projects, Jobs, Runs</span>
        <span className="flex-1" />
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </button>

      <ThemeToggle />
    </header>
  );
}
