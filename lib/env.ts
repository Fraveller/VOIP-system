/**
 * Asterisk / API URLs for the portal.
 *
 * Prefer server-only vars (`ASTERISK_*` without NEXT_PUBLIC) in `.env.local`.
 * They are read at runtime on the server and are NOT baked into `.next` bundles.
 *
 * `NEXT_PUBLIC_*` is still supported for backwards compatibility but is inlined
 * at compile time — change those only together with deleting `.next` + restart.
 */

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "")
}

function getRuntimeHostname() {
  if (typeof window === "undefined") return undefined
  const hostname = window.location.hostname?.trim()
  return hostname ? hostname : undefined
}

function env(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim()
    if (v) return v
  }
  return undefined
}

export type AsteriskEnvConfig = {
  directApi: string
  sipServer: string
  sipPort: string
}

/**
 * Resolve PBX targets from `.env.local`.
 * Server routes should call this per request (uses `ASTERISK_*` runtime env).
 */
export function resolveAsteriskConfig(options?: {
  browserHostname?: string
}): AsteriskEnvConfig {
  const apiPort =
    env("ASTERISK_API_PORT", "NEXT_PUBLIC_ASTERISK_API_PORT") ?? "3001"
  const sipPort =
    env("ASTERISK_SIP_PORT", "NEXT_PUBLIC_ASTERISK_SIP_PORT") ?? "5060"
  const explicitApi = env(
    "ASTERISK_API",
    "NEXT_PUBLIC_ASTERISK_API",
  )
  const configuredHost = env(
    "ASTERISK_HOST",
    "NEXT_PUBLIC_ASTERISK_HOST",
  )
  const explicitSipServer = env(
    "ASTERISK_SIP_SERVER",
    "NEXT_PUBLIC_ASTERISK_SIP_SERVER",
  )
  const browserHost = options?.browserHostname?.trim()
  const resolvedHost = configuredHost || browserHost || "localhost"

  const directApi = stripTrailingSlash(
    explicitApi ? explicitApi : `http://${resolvedHost}:${apiPort}/api`,
  )
  const sipServer = explicitSipServer || resolvedHost

  return { directApi, sipServer, sipPort }
}

/** Serverside / proxy: reads current process env (prefer `ASTERISK_*` vars). */
export function getAsteriskDirectApi(): string {
  return resolveAsteriskConfig().directApi
}

/** Host + path shown in PBX status UI (no secrets). */
export function formatAsteriskApiDisplay(directApi: string): string {
  try {
    const u = new URL(directApi)
    return `${u.host}${u.pathname}`
  } catch {
    return directApi
  }
}

const bootConfig = resolveAsteriskConfig({
  browserHostname: getRuntimeHostname(),
})

/** @deprecated Use `/api/portal/pbx-host` in the browser. */
export const ASTERISK_DIRECT_API = bootConfig.directApi

/** Browser → same-origin proxy; server → direct API URL. */
export const ASTERISK_API =
  typeof window === "undefined" ? bootConfig.directApi : "/api/pbx"

export const ASTERISK_SIP_SERVER = bootConfig.sipServer
export const ASTERISK_SIP_PORT = bootConfig.sipPort
