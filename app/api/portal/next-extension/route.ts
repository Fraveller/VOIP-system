import { NextResponse } from "next/server"
import { listPortalUsers } from "@/lib/portal-user-store"
import { pbxFetchUsersJson } from "@/lib/pbx-server-sync"
import { suggestNextExtension } from "@/lib/mock-data"

export async function GET() {
  const portalRows = await listPortalUsers()
  const fromPortal = portalRows.map((u) => ({ extension: u.extension }))
  const pbx = await pbxFetchUsersJson()
  const fromPbx: { extension: string }[] = Array.isArray(pbx)
    ? pbx
        .map((x) => {
          if (x && typeof x === "object" && "extension" in x) {
            return { extension: String((x as { extension: unknown }).extension) }
          }
          return { extension: "" }
        })
        .filter((x) => x.extension.length > 0)
    : []
  const next = suggestNextExtension(
    [...fromPortal, ...fromPbx] as { extension?: string }[],
    []
  )
  return NextResponse.json({ next })
}
