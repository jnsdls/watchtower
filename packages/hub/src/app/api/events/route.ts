import { NextResponse } from "next/server";
import { getHubDatabase } from "../../../db/runtime";
import {
  EventBatchValidationError,
  ingestEventBatch,
} from "../../../ingestion";
import { eventBroadcaster } from "../../../sse-stream";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const db = await getHubDatabase();

  try {
    const result = await ingestEventBatch(db, await request.json());
    eventBroadcaster.publish(result.events);
    // Lifecycle telemetry (run.started, run.completed, job.*) doesn't
    // surface through `result.events`, so dashboards subscribed to the
    // SSE stream need an out-of-band nudge to re-fetch.
    if (result.events.length === 0 && result.lifecycleCount > 0) {
      eventBroadcaster.pulse();
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof EventBatchValidationError) {
      return NextResponse.json(
        { error: "Invalid Event batch", details: error.message },
        { status: 400 },
      );
    }

    throw error;
  }
};
