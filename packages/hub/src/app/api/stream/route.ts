import { getHubDatabase } from "../../../db/runtime";
import { createSseResponse } from "../../../sse-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  const db = await getHubDatabase();

  return createSseResponse(db, request);
};
