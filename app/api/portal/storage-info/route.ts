import { stat } from "fs/promises"
import { NextResponse } from "next/server"
import { getAsteriskDirectApi } from "@/lib/env"
import {
  getPortalUsersFilePath,
  listPortalUsers,
} from "@/lib/portal-user-store"

/**
 * Read-only diagnostics: where portal user data lives vs PBX bridge.
 * Not SQL — users are in data/portal-users.json on this host.
 */
export async function GET(req: Request) {
  const filePath = getPortalUsersFilePath()
  let fileExists = false
  let fileModifiedAt: string | null = null
  try {
    const s = await stat(filePath)
    fileExists = true
    fileModifiedAt = s.mtime.toISOString()
  } catch {
    fileExists = false
  }

  const users = await listPortalUsers()
  const directApi = getAsteriskDirectApi()
  let pbxDisplay = directApi
  try {
    const u = new URL(directApi)
    pbxDisplay = `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    /* keep raw */
  }

  const probe = new URL(req.url).searchParams.get("probe") === "1"
  let pbxReachable: boolean | null = null
  if (probe) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 4000)
      const r = await fetch(`${directApi}/asterisk/info`, {
        method: "GET",
        signal: ctrl.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      clearTimeout(t)
      pbxReachable = r.ok || r.status === 401 || r.status === 403
    } catch {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 4000)
        const r = await fetch(`${directApi}/info`, {
          method: "GET",
          signal: ctrl.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        })
        clearTimeout(t)
        pbxReachable = r.ok || r.status === 401 || r.status === 403
      } catch {
        pbxReachable = false
      }
    }
  }

  return NextResponse.json({
    explanation:
      "User Management reads/writes via the Asterisk HTTP bridge (NEXT_PUBLIC_ASTERISK_API → serverside ASTERISK_DIRECT_API). The portal UI does not own user rows; optional legacy file data/portal-users.json exists only if you still call /api/portal/users.",
    portalUserStore: {
      type: "json_file",
      relativePath: "data/portal-users.json",
      absolutePath: filePath,
      fileExists,
      fileModifiedAt,
      userCount: users.length,
      sampleEmails: users.slice(0, 5).map((u) => u.email),
    },
    pbxBridge: {
      configuredUrl: pbxDisplay,
      probeHint:
        "Add ?probe=1 to this URL to test if the PBX HTTP API responds (short timeout).",
      ...(probe ? { reachable: pbxReachable } : {}),
    },
  })
}
