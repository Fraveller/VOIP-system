import { readFile, writeFile, mkdir } from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"
import {
  DEFAULT_SECURITY_SETTINGS,
  normalizeSecuritySettings,
  type SecuritySettings,
} from "@/lib/security-settings"

const FILE = path.join(process.cwd(), "data", "security-settings.json")

async function readSettings(): Promise<SecuritySettings> {
  try {
    const raw = await readFile(FILE, "utf8")
    return normalizeSecuritySettings(JSON.parse(raw) as Partial<SecuritySettings>)
  } catch {
    return { ...DEFAULT_SECURITY_SETTINGS }
  }
}

async function writeSettings(settings: SecuritySettings) {
  await mkdir(path.dirname(FILE), { recursive: true })
  await writeFile(FILE, JSON.stringify(settings, null, 2), "utf8")
}

export async function GET() {
  const settings = await readSettings()
  return NextResponse.json(settings, {
    headers: { "cache-control": "no-store" },
  })
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<SecuritySettings>
    const settings = normalizeSecuritySettings(body)
    await writeSettings(settings)
    return NextResponse.json({ ok: true, settings })
  } catch {
    return NextResponse.json(
      { error: "Invalid security settings payload" },
      { status: 400 }
    )
  }
}
