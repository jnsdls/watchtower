"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import {
  isThemePreference,
  type ThemePreference,
  themeStorageKey,
} from "./storage-key";

const options: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}> = [
  { value: "system", label: "System theme", Icon: Monitor },
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "dark", label: "Dark theme", Icon: Moon },
];

const readStoredPreference = (): ThemePreference => {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

const prefersDarkMatcher = () =>
  typeof window === "undefined"
    ? null
    : window.matchMedia("(prefers-color-scheme: dark)");

const applyPreference = (preference: ThemePreference) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const systemDark = prefersDarkMatcher()?.matches ?? false;
  const shouldBeDark =
    preference === "dark" || (preference === "system" && systemDark);

  root.classList.toggle("dark", shouldBeDark);
};

export function ThemeToggle() {
  // Render a placeholder until the client knows which option is active so the
  // SSR markup matches the initial client paint.
  const [mounted, setMounted] = useState(false);
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    setPreference(readStoredPreference());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const matcher = prefersDarkMatcher();
    if (!matcher) {
      return;
    }

    const handle = () => applyPreference("system");
    matcher.addEventListener("change", handle);
    return () => matcher.removeEventListener("change", handle);
  }, [preference]);

  const select = (next: ThemePreference) => {
    setPreference(next);
    applyPreference(next);

    try {
      if (next === "system") {
        window.localStorage.removeItem(themeStorageKey);
      } else {
        window.localStorage.setItem(themeStorageKey, next);
      }
    } catch {
      /* Storage unavailable — preference is still applied for this session. */
    }
  };

  return (
    <fieldset className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
      <legend className="sr-only">Theme</legend>
      {options.map(({ value, label, Icon }) => {
        const isActive = mounted && preference === value;
        return (
          <button
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "bg-muted text-foreground",
            )}
            key={value}
            onClick={() => select(value)}
            type="button"
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </fieldset>
  );
}
