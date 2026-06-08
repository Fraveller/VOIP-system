export type PortalNotificationPrefs = {
  emailNotifications: boolean
  callAlerts: boolean
  securityAlerts: boolean
}

const DEFAULT_PREFS: PortalNotificationPrefs = {
  emailNotifications: true,
  callAlerts: true,
  securityAlerts: true,
}

function storageKey(userId: string) {
  return `voip-portal-prefs-${userId}`
}

export function loadNotificationPrefs(
  userId: string
): PortalNotificationPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<PortalNotificationPrefs>
    return {
      emailNotifications:
        parsed.emailNotifications ?? DEFAULT_PREFS.emailNotifications,
      callAlerts: parsed.callAlerts ?? DEFAULT_PREFS.callAlerts,
      securityAlerts: parsed.securityAlerts ?? DEFAULT_PREFS.securityAlerts,
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function saveNotificationPrefs(
  userId: string,
  prefs: PortalNotificationPrefs
): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs))
}
