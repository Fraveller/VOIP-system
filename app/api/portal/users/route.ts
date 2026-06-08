import { NextResponse } from "next/server"
import {
  addPortalUser,
  listPortalUsers,
  toPublicUser,
} from "@/lib/portal-user-store"
import { pbxPostExtension, pbxPostUser } from "@/lib/pbx-server-sync"

export async function GET() {
  const rows = await listPortalUsers()
  return NextResponse.json(rows.map(toPublicUser))
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const password = typeof body.password === "string" ? body.password : ""
    const name = typeof body.name === "string" ? body.name : ""
    const email = typeof body.email === "string" ? body.email : ""
    const department = typeof body.department === "string" ? body.department : ""
    const role = typeof body.role === "string" ? body.role : "user"
    const extension = String(body.extension ?? "").trim()
    const status = typeof body.status === "string" ? body.status : "active"
    const lastLogin =
      typeof body.lastLogin === "string"
        ? body.lastLogin
        : new Date().toISOString().slice(0, 16).replace("T", " ")
    const mustChangePassword = Boolean(body.mustChangePassword ?? true)
    const id = typeof body.id === "string" ? body.id : undefined

    if (!name || !email || !department || !extension || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const { public: user } = await addPortalUser({
      id,
      name,
      email,
      department,
      role,
      extension,
      status,
      lastLogin,
      mustChangePassword,
      password,
    })

    const pbxExtensionOk = await pbxPostExtension(extension, password)
    const pbxUserOk = await pbxPostUser({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      extension: user.extension,
      status: user.status,
      lastLogin: user.lastLogin,
      mustChangePassword: user.mustChangePassword,
      password,
    })

    return NextResponse.json({
      user,
      pbx: { extension: pbxExtensionOk, userRecord: pbxUserOk },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
