import { NextResponse } from "next/server"
import { resolvePbxConnectionInfo } from "@/lib/pbx-host"

/** Live PBX host the portal is configured to reach (serverside env). */
export async function GET() {
  return NextResponse.json(resolvePbxConnectionInfo(), {
    headers: { "cache-control": "no-store" },
  })
}
