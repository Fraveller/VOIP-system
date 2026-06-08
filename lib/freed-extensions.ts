const STORAGE_KEY = "voip-portal-freed-extensions"

/** Remember extension numbers freed by delete so admins can reassign them. */
export function recordFreedExtension(extension: string) {
  const ext = String(extension ?? "").trim()
  if (!ext || typeof window === "undefined") return
  const list = listFreedExtensions().filter((e) => e !== ext)
  list.unshift(ext)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
}

export function listFreedExtensions(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.map((e) => String(e).trim()).filter(Boolean)
      : []
  } catch {
    return []
  }
}

export function clearFreedExtension(extension: string) {
  const ext = String(extension ?? "").trim()
  if (!ext || typeof window === "undefined") return
  const next = listFreedExtensions().filter((e) => e !== ext)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
