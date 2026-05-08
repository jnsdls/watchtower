export const buildHubBadge = (
  env: Partial<Record<"HOSTNAME" | "PORT" | "WATCHTOWER_PORT", string>>,
) => {
  const port = env.WATCHTOWER_PORT ?? env.PORT ?? "7777";
  const endpoint =
    env.HOSTNAME && !["127.0.0.1", "localhost"].includes(env.HOSTNAME)
      ? `${env.HOSTNAME}:${port}`
      : `:${port}`;
  return `local · ${endpoint} · pglite`;
};

const shortId = (value: string) =>
  value.length > 12 ? value.slice(0, 8) : value;

export const buildBreadcrumbs = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return ["Projects"];
  }

  const breadcrumbs: string[] = [];
  for (let index = 0; index < segments.length; index += 2) {
    const resource = segments[index];
    const id = segments[index + 1];
    if (resource === "projects") {
      breadcrumbs.push("Projects");
    } else if (resource === "jobs") {
      breadcrumbs.push("Jobs");
    } else if (resource === "runs") {
      breadcrumbs.push("Runs");
    } else if (resource) {
      breadcrumbs.push(shortId(resource));
    }
    if (id) {
      breadcrumbs.push(shortId(id));
    }
  }

  return breadcrumbs;
};
