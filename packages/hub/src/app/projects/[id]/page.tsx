import { notFound } from "next/navigation";
import { ProjectDetailPage } from "../../../dashboard/pages";
import {
  getProject,
  getProjectDashboardMetrics,
  listJobsForProjectSummary,
} from "../../../db/queries";
import { getHubDatabase } from "../../../db/runtime";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getHubDatabase();
  const project = await getProject(db, id);

  if (!project) {
    notFound();
  }

  const [jobs, metrics] = await Promise.all([
    listJobsForProjectSummary(db, id),
    getProjectDashboardMetrics(db, id),
  ]);

  return <ProjectDetailPage jobs={jobs} metrics={metrics} project={project} />;
}
