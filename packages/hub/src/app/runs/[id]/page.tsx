import { notFound } from "next/navigation";
import { RunDetailPage } from "../../../dashboard/pages";
import {
  getRun,
  listEventsForRun,
  listIterationsForRun,
} from "../../../db/queries";
import { getHubDatabase } from "../../../db/runtime";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getHubDatabase();
  const run = await getRun(db, id);

  if (!run) {
    notFound();
  }

  const events = await listEventsForRun(db, id);
  const iterations = await listIterationsForRun(db, id);

  return <RunDetailPage events={events} iterations={iterations} run={run} />;
}
