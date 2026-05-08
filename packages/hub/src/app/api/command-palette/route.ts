import { NextResponse } from "next/server";
import { listCommandPaletteSnapshot } from "../../../db/queries";
import { getHubDatabase } from "../../../db/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async () => {
  const db = await getHubDatabase();
  return NextResponse.json(await listCommandPaletteSnapshot(db));
};
