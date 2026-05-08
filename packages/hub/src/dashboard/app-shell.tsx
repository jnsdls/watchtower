import type { ReactNode } from "react";
import { TopBar } from "./app-top-bar";
import { LiveUpdates } from "./live-updates";

export { buildBreadcrumbs, buildHubBadge } from "./app-shell-data";

export function AppShell({
  children,
  hubBadge,
}: {
  children: ReactNode;
  hubBadge: string;
}) {
  return (
    <body className="bg-bg font-sans text-fg">
      <TopBar hubBadge={hubBadge} />
      <LiveUpdates />
      {children}
    </body>
  );
}
