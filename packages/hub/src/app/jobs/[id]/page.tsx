import { notFound } from "next/navigation";
import { JobDetailPage } from "../../../dashboard/pages";
import { getJob, listRunsForJob, listTasksForJob } from "../../../db/queries";
import { getHubDatabase } from "../../../db/runtime";

export const dynamic = "force-dynamic";

export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gantt?: string }>;
}) {
  const { id } = await params;
  const { gantt } = await searchParams;
  const db = await getHubDatabase();
  const job = await getJob(db, id);

  if (!job) {
    notFound();
  }

  const runs = await listRunsForJob(db, id);
  const tasks = await listTasksForJob(db, id);

  return (
    <JobDetailPage ganttMode={gantt} job={job} runs={runs} tasks={tasks} />
  );
}
