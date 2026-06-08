import { NextResponse } from "next/server"
import {
  findPortalUserByEmail,
  toPublicUser,
  verifyPortalPassword,
} from "@/lib/portal-user-store"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string }
    const email = body.email?.trim() ?? ""
    const password = body.password ?? ""
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      )
    }
    const row = await findPortalUserByEmail(email)
    if (
      !row ||
      !verifyPortalPassword(password, row.passwordSalt, row.passwordHash)
    ) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    return NextResponse.json({ user: toPublicUser(row) })
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
