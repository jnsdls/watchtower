import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export const runtime = "nodejs";

export const GET = () =>
  NextResponse.json({
    status: "ok",
    version: packageJson.version,
  });
