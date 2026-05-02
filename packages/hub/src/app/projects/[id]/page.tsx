import { notFound } from "next/navigation";
import { ProjectDetailPage } from "../../../dashboard/pages";
import { getProject, listJobsForProjectSummary } from "../../../db/queries";
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

  const jobs = await listJobsForProjectSummary(db, id);

  return <ProjectDetailPage jobs={jobs} project={project} />;
}
