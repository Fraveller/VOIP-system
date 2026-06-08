import { NextResponse } from "next/server"
import {
  deletePortalUser,
  findPortalUserById,
  updatePortalUser,
} from "@/lib/portal-user-store"
import {
  pbxDeleteExtension,
  pbxDeleteUser,
  pbxPatchUser,
} from "@/lib/pbx-server-sync"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const patch = (await req.json()) as Record<string, unknown>
    const allowed: Record<string, unknown> = {}
    for (const k of ["name", "email", "department", "role", "status", "lastLogin"] as const) {
      if (patch[k] !== undefined) allowed[k] = patch[k]
    }
    const updated = await updatePortalUser(id, allowed as Parameters<typeof updatePortalUser>[1])
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    await pbxPatchUser(id, allowed)
    return NextResponse.json({ user: updated })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const row = await findPortalUserById(id)
  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  await pbxDeleteExtension(row.extension)
  await pbxDeleteUser(id)
  await deletePortalUser(id)
  return NextResponse.json({ ok: true })
}
