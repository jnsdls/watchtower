import { NextResponse } from "next/server";
import { cancelCoordinator } from "../../../../../../cancel-coordinator";
import { requestRunCancel } from "../../../../../../db/queries";
import { getHubDatabase } from "../../../../../../db/runtime";
import { eventBroadcaster } from "../../../../../../sse-stream";

export const runtime = "nodejs";

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) => {
  const { runId } = await params;
  const db = await getHubDatabase();
  const result = await requestRunCancel(db, {
    id: runId,
    requestedAt: new Date(),
  });

  if (result.status === "missing") {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (result.status === "requested") {
    cancelCoordinator.requestCancel(runId);

    if (result.event) {
      eventBroadcaster.publish([result.event]);
    }
  } else {
    cancelCoordinator.completeRun(runId);
  }

  return NextResponse.json({
    cancelRequested: result.status === "requested",
    runId,
    status: result.status,
  });
};
