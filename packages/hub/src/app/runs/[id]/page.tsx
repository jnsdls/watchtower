import { notFound } from "next/navigation";
import { RunDetailPage } from "../../../dashboard/pages";
import {
  getJob,
  getRun,
  getTask,
  listEventsForRun,
  listIterationsForRun,
} from "../../../db/queries";
import { getHubDatabase } from "../../../db/runtime";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ iter?: string }>;
}) {
  const { id } = await params;
  const { iter } = await searchParams;
  const db = await getHubDatabase();
  const run = await getRun(db, id);

  if (!run) {
    notFound();
  }

  const events = await listEventsForRun(db, id);
  const iterations = await listIterationsForRun(db, id);
  const job = await getJob(db, run.jobId);
  const task = run.taskId ? await getTask(db, run.taskId) : null;
  const activeIterationNumber = iter ? Number.parseInt(iter, 10) : null;

  return (
    <RunDetailPage
      activeIterationNumber={
        Number.isSafeInteger(activeIterationNumber)
          ? activeIterationNumber
          : null
      }
      events={events}
      iterations={iterations}
      job={job ?? null}
      run={run}
      task={task ?? null}
    />
  );
}
