export type SecuritySettings = {
  maxFailedLoginAttempts: number
  lockoutDurationSec: number
  sessionTimeoutMinutes: number
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  maxFailedLoginAttempts: 5,
  lockoutDurationSec: 30,
  sessionTimeoutMinutes: 30,
}

const STORAGE_KEY = "voip-portal-security-settings"

export const SECURITY_SETTINGS_CHANGED = "security-settings-changed"

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function normalizeSecuritySettings(
  raw: Partial<SecuritySettings> | null | undefined
): SecuritySettings {
  return {
    maxFailedLoginAttempts: clamp(
      Number(raw?.maxFailedLoginAttempts) || DEFAULT_SECURITY_SETTINGS.maxFailedLoginAttempts,
      3,
      20
    ),
    lockoutDurationSec: clamp(
      Number(raw?.lockoutDurationSec) || DEFAULT_SECURITY_SETTINGS.lockoutDurationSec,
      10,
      3600
    ),
    sessionTimeoutMinutes: clamp(
      Number(raw?.sessionTimeoutMinutes) || DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes,
      5,
      480
    ),
  }
}

export function getSecuritySettings(): SecuritySettings {
  if (typeof window === "undefined") return { ...DEFAULT_SECURITY_SETTINGS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SECURITY_SETTINGS }
    return normalizeSecuritySettings(JSON.parse(raw) as Partial<SecuritySettings>)
  } catch {
    return { ...DEFAULT_SECURITY_SETTINGS }
  }
}

export function saveSecuritySettingsLocal(settings: SecuritySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(SECURITY_SETTINGS_CHANGED))
}

export function sessionIdleMs(settings?: SecuritySettings) {
  const s = settings ?? getSecuritySettings()
  return s.sessionTimeoutMinutes * 60 * 1000
}
