import { NextResponse } from "next/server";
import { cancelCoordinator } from "../../../../../cancel-coordinator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) => {
  const { runId } = await params;

  try {
    await cancelCoordinator.awaitCancel(runId, request.signal);
  } catch {
    return new Response(null, { status: 204 });
  }

  return NextResponse.json({ cancelRequested: true, runId });
};
