export const PORTAL_PAGE_SEARCH_KEY = "portal-page-search"

export type PortalSearchHit = {
  id: string
  name: string
  extension: string
  department?: string
  email?: string
  kind: "user" | "extension"
}

export function setPortalPageSearch(query: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(PORTAL_PAGE_SEARCH_KEY, query.trim())
}

export function consumePortalPageSearch(): string {
  if (typeof window === "undefined") return ""
  const q = sessionStorage.getItem(PORTAL_PAGE_SEARCH_KEY) ?? ""
  sessionStorage.removeItem(PORTAL_PAGE_SEARCH_KEY)
  return q
}

export function filterSearchHits(
  users: Array<{
    id?: string
    name?: string
    email?: string
    extension?: string
    department?: string
  }>,
  query: string,
  limit = 8
): PortalSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const hits: PortalSearchHit[] = []
  const seen = new Set<string>()

  for (const u of users) {
    const ext = String(u.extension ?? "").trim()
    const name = String(u.name ?? "").trim()
    const email = String(u.email ?? "").trim()
    const dept = String(u.department ?? "").trim()
    const haystack = [name, email, ext, dept].join(" ").toLowerCase()
    if (!haystack.includes(q)) continue

    const key = ext || email || name
    if (!key || seen.has(key)) continue
    seen.add(key)

    hits.push({
      id: String(u.id ?? key),
      name: name || `Extension ${ext}`,
      extension: ext || "—",
      department: dept,
      email,
      kind: "user",
    })
    if (hits.length >= limit) break
  }

  return hits
}
