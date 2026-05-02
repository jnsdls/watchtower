import { notFound } from "next/navigation";
import { JobDetailPage } from "../../../dashboard/pages";
import { getJob, listRunsForJob } from "../../../db/queries";
import { getHubDatabase } from "../../../db/runtime";

export const dynamic = "force-dynamic";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getHubDatabase();
  const job = await getJob(db, id);

  if (!job) {
    notFound();
  }

  const runs = await listRunsForJob(db, id);

  return <JobDetailPage job={job} runs={runs} />;
}
