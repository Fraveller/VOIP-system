import {
  formatAsteriskApiDisplay,
  resolveAsteriskConfig,
} from "./env"

function configSourceLabel() {
  if (process.env.ASTERISK_API?.trim()) return "ASTERISK_API (.env.local)"
  if (process.env.ASTERISK_HOST?.trim()) return "ASTERISK_HOST (.env.local)"
  if (process.env.NEXT_PUBLIC_ASTERISK_API?.trim()) {
    return "NEXT_PUBLIC_ASTERISK_API (rebuild .next after change)"
  }
  if (process.env.NEXT_PUBLIC_ASTERISK_HOST?.trim()) {
    return "NEXT_PUBLIC_ASTERISK_HOST (rebuild .next after change)"
  }
  return "defaults"
}

/** Resolved PBX targets from `.env.local` (read on each API call). */
export function resolvePbxConnectionInfo() {
  const cfg = resolveAsteriskConfig()
  let apiHost = cfg.sipServer
  try {
    apiHost = new URL(cfg.directApi).hostname
  } catch {
    /* keep sip fallback */
  }

  return {
    /** HTTP bridge host the Next.js proxy connects to */
    host: apiHost,
    /** SIP server shown to softphones (may differ from API host) */
    sipHost: cfg.sipServer,
    sipPort: cfg.sipPort,
    configuredApi: cfg.directApi,
    displayTarget: formatAsteriskApiDisplay(cfg.directApi),
    configSource: configSourceLabel(),
  }
}

export type PbxConnectionInfo = ReturnType<typeof resolvePbxConnectionInfo>
