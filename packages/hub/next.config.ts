import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  // Drizzle reads its migrations folder at runtime (computed relative to
  // src/db/setup.ts via import.meta.url). Next's standalone tracer doesn't
  // discover that pattern, so the SQL files would be missing from the
  // bundled server. Include them explicitly so applyDatabaseMigrations
  // boots without "Can't find meta/_journal.json".
  outputFileTracingIncludes: {
    "/**/*": ["./drizzle/**/*"],
  },
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
