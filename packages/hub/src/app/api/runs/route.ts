import { NextResponse } from "next/server";
import { listRuns } from "../../../db/queries";
import { getHubDatabase } from "../../../db/runtime";

export const runtime = "nodejs";

export const GET = async () => {
  const db = await getHubDatabase();
  return NextResponse.json({ runs: await listRuns(db) });
};
