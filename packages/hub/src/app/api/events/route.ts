import { NextResponse } from "next/server";
import { getHubDatabase } from "../../../db/runtime";
import {
  EventBatchValidationError,
  ingestEventBatch,
} from "../../../ingestion";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const db = await getHubDatabase();

  try {
    const result = await ingestEventBatch(db, await request.json());
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
