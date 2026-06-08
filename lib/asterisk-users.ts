import { normalizeUsersList } from "@/lib/mock-data"

/** Matches readJsonResponse() shape */
export type ApiJsonRead = {
  object: Record<string, unknown> | null
  array: unknown[] | null
  text: string
}

/** Parse GET /users body into a user array. */
export function usersFromApiRead(parsed: ApiJsonRead): unknown[] {
  const payload = parsed.array ?? parsed.object
  const list = normalizeUsersList(payload)
  return list === null ? [] : list
}

/** Parse POST/PATCH user response — bridge may return `{ user }` or the user object. */
export function userFromCreateResponse(
  parsed: ApiJsonRead,
  fallback: Record<string, unknown>
): Record<string, unknown> {
  const o = parsed.object
  if (!o) return fallback
  const inner = o.user
  if (inner && typeof inner === "object" && inner !== null && !Array.isArray(inner)) {
    return { ...fallback, ...(inner as Record<string, unknown>) }
  }
  if (typeof o.id === "string" || typeof o.email === "string") {
    return { ...fallback, ...o }
  }
  return fallback
}

/** Parse GET /nextextension — bridge may use `next`, `extension`, etc. */
export function nextExtensionFromRead(parsed: ApiJsonRead): string | null {
  const o = parsed.object
  if (!o) return null
  for (const key of ["next", "extension", "nextExtension", "next_extension"] as const) {
    const v = o[key]
    if (typeof v === "string" && v.trim() !== "") return v.trim()
    if (typeof v === "number" && Number.isFinite(v)) return String(Math.floor(v))
  }
  return null
}
