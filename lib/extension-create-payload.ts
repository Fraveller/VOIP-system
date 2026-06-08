function envTruthy(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

/**
 * JSON body for POST …/extensions on your Asterisk HTTP bridge.
 * Many bridges follow Asterisk naming (`secret`); this portal historically sent `password`.
 * Default: send several aliases (`ext`, `password`, `secret`) for compatibility.
 * Set `NEXT_PUBLIC_BRIDGE_EXTENSION_MINIMAL_BODY=true` if your server rejects unknown keys (strict schema).
 */
export function buildExtensionPostBody(
  extension: string,
  password: string
): Record<string, string> {
  const ext = extension.trim()
  const minimal = envTruthy("NEXT_PUBLIC_BRIDGE_EXTENSION_MINIMAL_BODY")

  if (minimal) {
    const body: Record<string, string> = {
      extension: ext,
      secret: password,
    }
    const ctx = process.env.NEXT_PUBLIC_BRIDGE_EXTENSION_CONTEXT?.trim()
    if (ctx) body.context = ctx
    const tech = process.env.NEXT_PUBLIC_BRIDGE_EXTENSION_TECHNOLOGY?.trim()
    if (tech) body.technology = tech
    return body
  }

  const body: Record<string, string> = {
    extension: ext,
    ext,
    password,
    secret: password,
  }
  const ctx = process.env.NEXT_PUBLIC_BRIDGE_EXTENSION_CONTEXT?.trim()
  if (ctx) body.context = ctx
  const tech = process.env.NEXT_PUBLIC_BRIDGE_EXTENSION_TECHNOLOGY?.trim()
  if (tech) body.technology = tech
  return body
}
