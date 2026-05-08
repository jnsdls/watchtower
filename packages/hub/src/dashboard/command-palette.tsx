"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Ban, FolderKanban, Layers, Search, Wrench } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";
import {
  buildCommandPaletteModel,
  type CommandPaletteItem,
  type CommandPaletteSnapshot,
  getNextCommandPaletteIndex,
} from "./command-palette-data";
import { Kbd, Mono, Num } from "./primitives";

const iconFor = (icon: CommandPaletteItem["icon"]) => {
  switch (icon) {
    case "cancel":
      return <Ban aria-hidden="true" className="size-3.5" />;
    case "folder":
      return <FolderKanban aria-hidden="true" className="size-3.5" />;
    case "layers":
      return <Layers aria-hidden="true" className="size-3.5" />;
    case "tool":
      return <Wrench aria-hidden="true" className="size-3.5" />;
  }
};

const statusDotClass = (status: string | undefined) => {
  switch (status) {
    case "running":
      return "animate-wt-pulse bg-st-running";
    case "succeeded":
    case "completed":
      return "bg-st-succeeded";
    case "failed":
      return "bg-st-failed";
    case "canceled":
      return "bg-st-canceled";
    default:
      return "bg-muted-2";
  }
};

type CommandPaletteGroup = {
  hint?: string;
  items: CommandPaletteItem[];
  label: string;
};

export function CommandPalette() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<CommandPaletteSnapshot | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.requestAnimationFrame(() => inputRef.current?.focus());

    let canceled = false;
    setSnapshot(null);
    setQuery("");

    fetch("/api/command-palette")
      .then((response) => response.json() as Promise<CommandPaletteSnapshot>)
      .then((nextSnapshot) => {
        if (!canceled) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch(() => {
        if (!canceled) {
          setSnapshot({ projects: [], jobs: [], runs: [], tasks: [] });
        }
      });

    return () => {
      canceled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const model = useMemo(
    () =>
      snapshot
        ? buildCommandPaletteModel(snapshot, { pathname, query })
        : {
            actionItems: [],
            goItems: [],
            jobItems: [],
            runItems: [],
            runMatchCount: 0,
            totalRunCount: 0,
          },
    [pathname, query, snapshot],
  );
  const groups = useMemo<CommandPaletteGroup[]>(
    () => [
      {
        hint: "matched by branch + Job title + Run name + Task title",
        items: model.runItems,
        label: "Jump to Run",
      },
      { items: model.jobItems, label: "Jump to Job" },
      { items: model.goItems, label: "Go to" },
      { items: model.actionItems, label: "Actions" },
    ],
    [model],
  );
  const flatItems = groups.flatMap((group) => group.items);

  useEffect(() => {
    setSelectedIndex(flatItems.length > 0 ? 0 : -1);
  }, [flatItems.length]);

  const activateItem = async (item: CommandPaletteItem | undefined) => {
    if (!item) {
      return;
    }

    if (item.action === "cancel-job" && item.jobId) {
      if (!window.confirm("Cancel all running Runs in this Job?")) {
        return;
      }

      await fetch(`/api/jobs/${item.jobId}/cancel`, { method: "POST" });
      setOpen(false);
      router.refresh();
      return;
    }

    if (item.href) {
      setOpen(false);
      router.push(item.href);
    }
  };

  const onDialogKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) =>
        getNextCommandPaletteIndex(index, flatItems.length, 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) =>
        getNextCommandPaletteIndex(index, flatItems.length, -1),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      void activateItem(flatItems[selectedIndex]);
    } else if ((event.metaKey || event.ctrlKey) && event.key === ".") {
      const cancelItem = model.actionItems[0];

      if (cancelItem) {
        event.preventDefault();
        void activateItem(cancelItem);
      }
    }
  };

  let cursor = 0;

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button
          className="hidden h-[26px] min-w-[220px] items-center gap-2 rounded-md border border-border bg-card px-2 text-muted text-xs transition-colors hover:border-border-strong hover:bg-hover hover:text-fg md:inline-flex"
          type="button"
        >
          <Search aria-hidden="true" className="size-3.5" />
          <span>Search Projects, Jobs, Runs</span>
          <span className="flex-1" />
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-label="Command palette"
          className="fixed top-[90px] left-1/2 z-50 w-[min(620px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-[10px] border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.45)] outline-none"
          onKeyDown={onDialogKeyDown}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search Projects, Jobs, Runs, and actions.
          </Dialog.Description>
          <div className="flex items-center gap-2.5 border-border border-b px-4 py-3.5">
            <Search aria-hidden="true" className="size-4 text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Projects, Jobs, Runs"
              ref={inputRef}
              value={query}
            />
            <Mono className="shrink-0 text-[11px] text-muted">
              <Num>{model.runMatchCount}</Num> of{" "}
              <Num>{model.totalRunCount}</Num> runs
            </Mono>
            <Kbd>esc</Kbd>
          </div>

          <div className="max-h-[420px] overflow-y-auto py-1">
            {snapshot ? (
              groups.map((group) =>
                group.items.length > 0 ? (
                  <div key={group.label}>
                    <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1.5">
                      <Mono className="font-medium text-[10px] text-muted uppercase">
                        {group.label}
                      </Mono>
                      {group.hint ? (
                        <Mono className="text-[10px] text-muted-2">
                          {group.hint}
                        </Mono>
                      ) : null}
                    </div>
                    {group.items.map((item) => {
                      const itemIndex = cursor;
                      const selected = itemIndex === selectedIndex;
                      cursor += 1;

                      return (
                        <button
                          className={cn(
                            "flex w-full items-center gap-2.5 border-transparent border-l-2 px-4 py-2 text-left transition-colors",
                            selected
                              ? "border-l-accent bg-hover"
                              : "hover:bg-hover",
                          )}
                          data-selected={selected}
                          key={item.id}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          onClick={() => void activateItem(item)}
                          type="button"
                        >
                          <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-[5px] border border-border bg-card-soft text-fg-soft">
                            {iconFor(item.icon)}
                          </span>
                          {item.status ? (
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                statusDotClass(item.status),
                              )}
                            />
                          ) : null}
                          <span className="min-w-0 flex-1 truncate text-fg text-sm">
                            {item.text}
                          </span>
                          {item.meta ? (
                            <Mono className="shrink-0 text-[11px] text-muted">
                              {item.meta}
                            </Mono>
                          ) : null}
                          {item.shortcut ? (
                            <span className="inline-flex shrink-0 gap-1">
                              {item.shortcut.map((key) => (
                                <Kbd key={key}>{key}</Kbd>
                              ))}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null,
              )
            ) : (
              <div className="px-4 py-6 text-muted text-sm">Loading...</div>
            )}
          </div>

          <div className="flex items-center gap-3 border-border border-t bg-bg-elev px-4 py-2.5 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>↵</Kbd>
              open
            </span>
            <span className="flex-1" />
            <span className="inline-flex items-center gap-1">
              scope: <Mono>all projects</Mono> <Kbd>⌥</Kbd>P
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
