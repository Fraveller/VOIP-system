/**
 * Path segments under NEXT_PUBLIC_ASTERISK_API (ARI base or unified bridge).
 * Override any segment via NEXT_PUBLIC_BRIDGE_PATH_* in .env.local — restart dev server after edits.
 *
 * Defaults match:
 * - Core ARI: endpoints, channels, asterisk/info (see Asterisk REST Interface)
 * - Portal REST (your Node/Python bridge): login, users, extensions, …
 */

function seg(envKey: string, fallback: string): string {
  const raw = process.env[envKey]?.trim()
  if (!raw) return fallback
  return raw.replace(/^\/+|\/+$/g, "")
}

/** Relative path segments (no leading slash). */
export const BridgePaths = {
  /** ARI: SIP/PJSIP endpoint states */
  endpoints: seg("NEXT_PUBLIC_BRIDGE_PATH_ENDPOINTS", "endpoints"),
  /** ARI: active channels */
  channels: seg("NEXT_PUBLIC_BRIDGE_PATH_CHANNELS", "channels"),
  /** ARI: GET asterisk build/system info */
  asteriskInfo: seg("NEXT_PUBLIC_BRIDGE_PATH_ASTERISK_INFO", "asterisk/info"),
  /** Custom bridge: lightweight health (if not using ARI) */
  info: seg("NEXT_PUBLIC_BRIDGE_PATH_INFO", "info"),
  /** Portal auth */
  login: seg("NEXT_PUBLIC_BRIDGE_PATH_LOGIN", "login"),
  /** Directory users synced with PBX DB */
  users: seg("NEXT_PUBLIC_BRIDGE_PATH_USERS", "users"),
  /** SIP extension provisioning */
  extensions: seg("NEXT_PUBLIC_BRIDGE_PATH_EXTENSIONS", "extensions"),
  /** Next free extension number */
  nextExtension: seg("NEXT_PUBLIC_BRIDGE_PATH_NEXT_EXTENSION", "nextextension"),
  /** Monitoring KPIs */
  system: seg("NEXT_PUBLIC_BRIDGE_PATH_SYSTEM", "system"),
  audit: seg("NEXT_PUBLIC_BRIDGE_PATH_AUDIT", "audit"),
  security: seg("NEXT_PUBLIC_BRIDGE_PATH_SECURITY", "security"),
  /** CDR */
  realcdr: seg("NEXT_PUBLIC_BRIDGE_PATH_REALCDR", "realcdr"),
  cdr: seg("NEXT_PUBLIC_BRIDGE_PATH_CDR", "cdr"),
  /** Voicemail list prefix — GET .../voicemail/{ext} */
  voicemail: seg("NEXT_PUBLIC_BRIDGE_PATH_VOICEMAIL", "voicemail"),
} as const

/**
 * Join API base (ASTERISK_API or ASTERISK_DIRECT_API) with path segments.
 * Example: apiUrl(base, BridgePaths.users, id, "change-password")
 */
export function apiUrl(base: string, ...parts: string[]): string {
  const b = base.replace(/\/$/, "")
  const tail = parts.filter((p) => p !== "").join("/")
  return tail ? `${b}/${tail}` : b
}
