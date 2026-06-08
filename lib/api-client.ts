/**
 * Read fetch Response as JSON when possible; never throw on parse errors.
 */
export async function readJsonResponse(res: Response): Promise<{
  object: Record<string, unknown> | null
  array: unknown[] | null
  text: string
}> {
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed) return { object: null, array: null, text: "" }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) return { object: null, array: parsed, text }
    if (parsed !== null && typeof parsed === "object") {
      return { object: parsed as Record<string, unknown>, array: null, text }
    }
    return { object: null, array: null, text }
  } catch {
    return { object: null, array: null, text }
  }
}

function messageFromJson(data: Record<string, unknown> | null): string | null {
  if (!data) return null
  const err = data.error
  if (typeof err === "string" && err.trim() !== "") return err.trim()
  if (typeof data.message === "string" && data.message.trim() !== "") {
    return data.message.trim()
  }
  if (typeof data.detail === "string" && data.detail.trim() !== "") {
    return data.detail.trim()
  }
  if (err !== null && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === "string" && m.trim() !== "") return m.trim()
  }
  return null
}

export function formatApiFailure(
  res: Response,
  data: Record<string, unknown> | null,
  text: string,
  fallback: string
): string {
  const fromJson = messageFromJson(data)
  if (fromJson) return fromJson
  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const limit = res.status >= 500 ? 900 : 320
  const snippet = cleaned.slice(0, limit)
  if (snippet) return `${fallback} (HTTP ${res.status}): ${snippet}`
  return `${fallback} (HTTP ${res.status}).`
}
