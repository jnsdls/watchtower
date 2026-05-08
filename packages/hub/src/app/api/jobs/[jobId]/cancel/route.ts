import { NextResponse } from "next/server";
import { cancelCoordinator } from "../../../../../cancel-coordinator";
import { requestJobCancel } from "../../../../../db/queries";
import { getHubDatabase } from "../../../../../db/runtime";
import { eventBroadcaster } from "../../../../../sse-stream";

export const runtime = "nodejs";

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const { jobId } = await params;
  const db = await getHubDatabase();
  const result = await requestJobCancel(db, {
    id: jobId,
    requestedAt: new Date(),
  });

  if (result.status === "missing") {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  for (const runId of result.runIds) {
    cancelCoordinator.requestCancel(runId);
  }

  if (result.events.length > 0) {
    eventBroadcaster.publish(result.events);
  }

  return NextResponse.json({
    canceledCount: result.canceledCount,
    jobId,
  });
};
