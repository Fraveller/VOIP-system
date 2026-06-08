import { ASTERISK_API, apiUrl, BridgePaths, fetchLiveEndpoints } from "./mock-data"

export type PortalNotification = {
  id: string
  title: string
  message: string
  type: "warning" | "info" | "danger"
  time: string
}

const READ_IDS_KEY = "portal-read-notification-ids"

export async function fetchPortalNotifications(
  isAdmin: boolean
): Promise<PortalNotification[]> {
  if (!isAdmin) return []
  const notifs: PortalNotification[] = []

  try {
    const endpoints = await fetchLiveEndpoints()
    if (Array.isArray(endpoints)) {
      const unregistered = endpoints.filter((e: any) => e.state !== "online").length
      if (unregistered > 0) {
        notifs.push({
          id: "unreg",
          title: "Unregistered Extensions",
          message: `${unregistered} extension(s) are not registered`,
          type: "warning",
          time: new Date().toLocaleTimeString(),
        })
      }
    }

    const chRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.channels))
    const channels = await chRes.json()
    if (Array.isArray(channels) && channels.length > 0) {
      notifs.push({
        id: "calls",
        title: "Active Calls",
        message: `${channels.length} call(s) in progress right now`,
        type: "info",
        time: new Date().toLocaleTimeString(),
      })
    }

    const sysRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.system))
    const sysData = await sysRes.json()
    if (sysData?.cpu > 80) {
      notifs.push({
        id: "cpu",
        title: "High CPU Usage",
        message: `Server CPU at ${sysData.cpu}%`,
        type: "danger",
        time: new Date().toLocaleTimeString(),
      })
    }
    if (sysData?.memory > 85) {
      notifs.push({
        id: "mem",
        title: "High Memory Usage",
        message: `Server memory at ${sysData.memory}%`,
        type: "danger",
        time: new Date().toLocaleTimeString(),
      })
    }

    const auditRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.audit))
    const auditData = await auditRes.json()
    if (Array.isArray(auditData) && auditData.length > 0) {
      const latest = auditData[0]
      notifs.push({
        id: "audit",
        title: "Recent Admin Action",
        message: `${latest.action}: ${latest.target}`,
        type: "info",
        time: latest.timestamp,
      })
    }
  } catch {
    // Best-effort notifications
  }

  return notifs
}

function getReadIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(READ_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((s) => String(s)) : []
  } catch {
    return []
  }
}

function setReadIds(ids: string[]) {
  localStorage.setItem(READ_IDS_KEY, JSON.stringify(ids))
}

export function unreadCount(notifs: PortalNotification[]): number {
  const read = new Set(getReadIds())
  return notifs.filter((n) => !read.has(n.id)).length
}

export function markAllNotificationsAsRead(notifs: PortalNotification[]) {
  const ids = Array.from(new Set([...getReadIds(), ...notifs.map((n) => n.id)]))
  setReadIds(ids)
}

