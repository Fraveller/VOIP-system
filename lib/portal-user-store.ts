import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

export type PortalUserPublic = {
  id: string
  name: string
  email: string
  department: string
  role: string
  extension: string
  status: string
  lastLogin: string
  mustChangePassword?: boolean
}

export type PortalUserRecord = PortalUserPublic & {
  passwordSalt: string
  passwordHash: string
}

const DATA_DIR = join(process.cwd(), "data")
const DATA_FILE = join(DATA_DIR, "portal-users.json")

/** For diagnostics / ops — portal users are not in SQL, they live in this JSON file. */
export function getPortalDataDirectory(): string {
  return DATA_DIR
}

export function getPortalUsersFilePath(): string {
  return DATA_FILE
}

type FileShape = { users: PortalUserRecord[] }

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return { salt, hash }
}

export function verifyPortalPassword(
  password: string,
  salt: string,
  hashHex: string
): boolean {
  if (!salt || !hashHex) return false
  try {
    const derived = scryptSync(password, salt, 64)
    const expected = Buffer.from(hashHex, "hex")
    if (derived.length !== expected.length) return false
    return timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

export function toPublicUser(u: PortalUserRecord): PortalUserPublic {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    department: u.department,
    role: u.role,
    extension: u.extension,
    status: u.status,
    lastLogin: u.lastLogin,
    mustChangePassword: u.mustChangePassword,
  }
}

async function readFileShape(): Promise<FileShape> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8")
    const j = JSON.parse(raw) as unknown
    if (j && typeof j === "object" && "users" in j) {
      const users = (j as FileShape).users
      return { users: Array.isArray(users) ? users : [] }
    }
  } catch {
    /* missing or invalid */
  }
  return { users: [] }
}

async function writeFileShape(data: FileShape): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8")
}

export async function listPortalUsers(): Promise<PortalUserRecord[]> {
  const { users } = await readFileShape()
  return users
}

export async function findPortalUserByEmail(
  email: string
): Promise<PortalUserRecord | undefined> {
  const key = email.trim().toLowerCase()
  const { users } = await readFileShape()
  return users.find((u) => u.email.trim().toLowerCase() === key)
}

export async function findPortalUserById(
  id: string
): Promise<PortalUserRecord | undefined> {
  const { users } = await readFileShape()
  return users.find((u) => u.id === id)
}

export async function addPortalUser(
  input: Omit<PortalUserPublic, "id"> & {
    id?: string
    password: string
  }
): Promise<{ record: PortalUserRecord; public: PortalUserPublic }> {
  const { users } = await readFileShape()
  const emailKey = input.email.trim().toLowerCase()
  if (users.some((u) => u.email.trim().toLowerCase() === emailKey)) {
    throw new Error("EMAIL_EXISTS")
  }
  const { salt, hash } = hashPassword(input.password)
  const record: PortalUserRecord = {
    id: input.id?.trim() || `pu_${Date.now()}`,
    name: input.name,
    email: input.email.trim(),
    department: input.department,
    role: input.role,
    extension: String(input.extension).trim(),
    status: input.status || "active",
    lastLogin: input.lastLogin,
    mustChangePassword: input.mustChangePassword ?? true,
    passwordSalt: salt,
    passwordHash: hash,
  }
  users.push(record)
  await writeFileShape({ users })
  return { record, public: toPublicUser(record) }
}

export async function updatePortalUser(
  id: string,
  patch: Partial<
    Pick<
      PortalUserPublic,
      "name" | "email" | "department" | "role" | "status" | "lastLogin"
    >
  >
): Promise<PortalUserPublic | null> {
  const { users } = await readFileShape()
  const idx = users.findIndex((u) => u.id === id)
  if (idx < 0) return null
  const next = { ...users[idx], ...patch }
  if (patch.email) {
    const key = patch.email.trim().toLowerCase()
    if (
      users.some(
        (u, i) => i !== idx && u.email.trim().toLowerCase() === key
      )
    ) {
      throw new Error("EMAIL_EXISTS")
    }
    next.email = patch.email.trim()
  }
  users[idx] = next
  await writeFileShape({ users })
  return toPublicUser(users[idx])
}

export async function deletePortalUser(id: string): Promise<boolean> {
  const { users } = await readFileShape()
  const next = users.filter((u) => u.id !== id)
  if (next.length === users.length) return false
  await writeFileShape({ users: next })
  return true
}

export async function setPortalPassword(
  id: string,
  newPlainPassword: string
): Promise<boolean> {
  const { users } = await readFileShape()
  const idx = users.findIndex((u) => u.id === id)
  if (idx < 0) return false
  const { salt, hash } = hashPassword(newPlainPassword)
  users[idx] = {
    ...users[idx],
    passwordSalt: salt,
    passwordHash: hash,
    mustChangePassword: false,
  }
  await writeFileShape({ users })
  return true
}
