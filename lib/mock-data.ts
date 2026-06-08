export const departments = [
  "Computing Centre (UCC)",
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Engineering",
  "Law",
  "Business Administration",
  "Education",
  "Medicine",
  "Library",
  "Administration",
]

export const users = []

export const extensions = [
  { extension: "1001", assignedUser: "Dr. Amina Mwangi", registrationStatus: "registered", network: "LAN", encryption: "TLS/SRTP", lastIp: "10.0.1.15", department: "Computing Centre (UCC)" },
  { extension: "2045", assignedUser: "John Kimaro", registrationStatus: "registered", network: "WAN", encryption: "TLS/SRTP", lastIp: "41.86.160.12", department: "Computer Science" },
  { extension: "2046", assignedUser: "Grace Mtui", registrationStatus: "registered", network: "LAN", encryption: "TLS/SRTP", lastIp: "10.0.2.20", department: "Mathematics" },
  { extension: "3001", assignedUser: "Prof. Said Hassan", registrationStatus: "registered", network: "LAN", encryption: "TLS only", lastIp: "10.0.3.5", department: "Physics" },
  { extension: "3020", assignedUser: "Mary Chacha", registrationStatus: "unregistered", network: "N/A", encryption: "None", lastIp: "N/A", department: "Engineering" },
  { extension: "4010", assignedUser: "David Minja", registrationStatus: "registered", network: "WAN", encryption: "TLS/SRTP", lastIp: "41.86.162.8", department: "Law" },
  { extension: "4020", assignedUser: "Fatma Salum", registrationStatus: "registered", network: "LAN", encryption: "TLS/SRTP", lastIp: "10.0.4.11", department: "Business Administration" },
  { extension: "5001", assignedUser: "Peter Lema", registrationStatus: "registered", network: "LAN", encryption: "TLS/SRTP", lastIp: "10.0.5.2", department: "Education" },
  { extension: "1002", assignedUser: "Anna Mkapa", registrationStatus: "registered", network: "LAN", encryption: "TLS/SRTP", lastIp: "10.0.1.20", department: "Medicine" },
  { extension: "5010", assignedUser: "James Mwakalinga", registrationStatus: "registered", network: "WAN", encryption: "TLS only", lastIp: "41.86.165.22", department: "Library" },
]

export const callRecords = [
  { id: "1", dateTime: "2026-02-23 09:15:22", caller: "1001", callerName: "Dr. Amina Mwangi", callee: "2045", calleeName: "John Kimaro", duration: "3:42", type: "Internal", networkOrigin: "LAN" },
  { id: "2", dateTime: "2026-02-23 09:30:05", caller: "2045", callerName: "John Kimaro", callee: "3001", calleeName: "Prof. Said Hassan", duration: "12:18", type: "Internal", networkOrigin: "WAN" },
  { id: "3", dateTime: "2026-02-23 10:05:11", caller: "4010", callerName: "David Minja", callee: "+255222410500", calleeName: "External", duration: "5:02", type: "Outbound", networkOrigin: "WAN" },
  { id: "4", dateTime: "2026-02-23 10:15:30", caller: "+255222410600", callerName: "External", callee: "1001", calleeName: "Dr. Amina Mwangi", duration: "1:55", type: "Inbound", networkOrigin: "LAN" },
  { id: "5", dateTime: "2026-02-23 10:45:00", caller: "2046", callerName: "Grace Mtui", callee: "4020", calleeName: "Fatma Salum", duration: "8:30", type: "Internal", networkOrigin: "LAN" },
  { id: "6", dateTime: "2026-02-23 11:00:15", caller: "5001", callerName: "Peter Lema", callee: "1002", calleeName: "Anna Mkapa", duration: "0:00", type: "Missed", networkOrigin: "LAN" },
  { id: "7", dateTime: "2026-02-23 11:20:40", caller: "1002", callerName: "Anna Mkapa", callee: "5010", calleeName: "James Mwakalinga", duration: "2:15", type: "Internal", networkOrigin: "LAN" },
  { id: "8", dateTime: "2026-02-23 11:45:22", caller: "+255754123456", callerName: "External", callee: "3001", calleeName: "Prof. Said Hassan", duration: "6:10", type: "Inbound", networkOrigin: "LAN" },
  { id: "9", dateTime: "2026-02-23 12:00:00", caller: "4020", callerName: "Fatma Salum", callee: "+255222410700", calleeName: "External", duration: "4:22", type: "Outbound", networkOrigin: "LAN" },
  { id: "10", dateTime: "2026-02-23 12:30:10", caller: "2045", callerName: "John Kimaro", callee: "2046", calleeName: "Grace Mtui", duration: "0:00", type: "Missed", networkOrigin: "WAN" },
]

export const voicemails = [
  { id: "1", caller: "+255222410600", callerName: "External Caller", date: "2026-02-23 10:20", duration: "0:45", read: false },
  { id: "2", caller: "5001", callerName: "Peter Lema", date: "2026-02-23 11:05", duration: "1:12", read: false },
  { id: "3", caller: "+255754123456", callerName: "External Caller", date: "2026-02-22 15:30", duration: "0:32", read: true },
  { id: "4", caller: "1001", callerName: "Dr. Amina Mwangi", date: "2026-02-22 09:00", duration: "0:58", read: true },
  { id: "5", caller: "4010", callerName: "David Minja", date: "2026-02-21 16:45", duration: "1:05", read: true },
]

export const auditLogs = [
  { id: "1", timestamp: "2026-02-23 09:00:12", admin: "Dr. Amina Mwangi", action: "Created User", target: "New Staff Member", ip: "10.0.1.15" },
  { id: "2", timestamp: "2026-02-23 08:55:30", admin: "Dr. Amina Mwangi", action: "Modified Extension", target: "Ext 3020", ip: "10.0.1.15" },
  { id: "3", timestamp: "2026-02-23 08:45:00", admin: "Anna Mkapa", action: "Suspended User", target: "Mary Chacha", ip: "10.0.1.20" },
  { id: "4", timestamp: "2026-02-22 17:30:00", admin: "Dr. Amina Mwangi", action: "Updated Security Policy", target: "Login Threshold", ip: "10.0.1.15" },
  { id: "5", timestamp: "2026-02-22 16:00:00", admin: "Anna Mkapa", action: "Reset Password", target: "James Mwakalinga", ip: "10.0.1.20" },
  { id: "6", timestamp: "2026-02-22 14:20:00", admin: "Dr. Amina Mwangi", action: "Added Extension", target: "Ext 5015", ip: "10.0.1.15" },
  { id: "7", timestamp: "2026-02-22 10:00:00", admin: "Anna Mkapa", action: "Unlocked Account", target: "Fatma Salum", ip: "10.0.1.20" },
  { id: "8", timestamp: "2026-02-21 15:45:00", admin: "Dr. Amina Mwangi", action: "Modified Firewall Rule", target: "Block IP Range", ip: "10.0.1.15" },
]

export const securityEvents = [
  { id: "1", timestamp: "2026-02-23 09:12:00", event: "Failed Login Attempt", source: "41.86.170.55", severity: "warning", details: "3 failed attempts for user john@udsm.ac.tz" },
  { id: "2", timestamp: "2026-02-23 08:30:00", event: "IP Blocked", source: "185.220.101.45", severity: "critical", details: "Brute force attack detected" },
  { id: "3", timestamp: "2026-02-22 22:15:00", event: "Unusual Login Time", source: "41.86.160.12", severity: "info", details: "Login from John Kimaro outside business hours" },
  { id: "4", timestamp: "2026-02-22 18:00:00", event: "TLS Certificate Expiring", source: "PBX Server", severity: "warning", details: "Certificate expires in 15 days" },
  { id: "5", timestamp: "2026-02-22 14:45:00", event: "Failed Login Attempt", source: "10.0.5.100", severity: "warning", details: "5 failed attempts - account locked" },
]

export const blockedIPs = [
  { ip: "185.220.101.45", reason: "Brute force attack", blockedSince: "2026-02-23 08:30", autoExpiry: "2026-02-24 08:30" },
  { ip: "92.63.197.22", reason: "Port scanning", blockedSince: "2026-02-22 03:15", autoExpiry: "2026-02-23 03:15" },
  { ip: "45.155.205.8", reason: "SIP flood detected", blockedSince: "2026-02-21 19:00", autoExpiry: "Manual" },
]

export const callsPerHour = [
  { hour: "06:00", calls: 2 }, { hour: "07:00", calls: 8 }, { hour: "08:00", calls: 25 },
  { hour: "09:00", calls: 42 }, { hour: "10:00", calls: 55 }, { hour: "11:00", calls: 48 },
  { hour: "12:00", calls: 30 }, { hour: "13:00", calls: 35 }, { hour: "14:00", calls: 50 },
  { hour: "15:00", calls: 45 }, { hour: "16:00", calls: 38 }, { hour: "17:00", calls: 15 },
  { hour: "18:00", calls: 5 },
]

export const callsPerDepartment = [
  { department: "UCC", calls: 85 },
  { department: "CompSci", calls: 62 },
  { department: "Engineering", calls: 55 },
  { department: "Law", calls: 40 },
  { department: "Medicine", calls: 38 },
  { department: "Business", calls: 32 },
  { department: "Education", calls: 28 },
  { department: "Library", calls: 15 },
]

export const networkRatio = [
  { name: "LAN (Local)", value: 68 },
  { name: "WAN (Remote)", value: 32 },
]

export const directoryEntries = [
  { name: "Dr. Amina Mwangi", extension: "1001", department: "Computing Centre (UCC)", presence: "available" },
  { name: "John Kimaro", extension: "2045", department: "Computer Science", presence: "busy" },
  { name: "Grace Mtui", extension: "2046", department: "Mathematics", presence: "available" },
  { name: "Prof. Said Hassan", extension: "3001", department: "Physics", presence: "away" },
  { name: "Mary Chacha", extension: "3020", department: "Engineering", presence: "offline" },
  { name: "David Minja", extension: "4010", department: "Law", presence: "available" },
  { name: "Fatma Salum", extension: "4020", department: "Business Administration", presence: "dnd" },
  { name: "Peter Lema", extension: "5001", department: "Education", presence: "available" },
  { name: "Anna Mkapa", extension: "1002", department: "Medicine", presence: "busy" },
  { name: "James Mwakalinga", extension: "5010", department: "Library", presence: "available" },
]

// ─── Live Asterisk Backend Config (from .env.local via lib/env.ts) ───────────
import {
  ASTERISK_API,
  ASTERISK_SIP_PORT,
  ASTERISK_SIP_SERVER,
} from "./env"
import { apiUrl, BridgePaths } from "./bridge-paths"

export { ASTERISK_API, ASTERISK_SIP_PORT, ASTERISK_SIP_SERVER }
export { apiUrl, BridgePaths } from "./bridge-paths"

/** Unwrap custom array APIs and Asterisk ARI (`{ endpoints: [...] }`). */
export function normalizeEndpointsList(data: unknown): any[] | null {
  if (data == null) return []
  if (Array.isArray(data)) return data
  if (typeof data === "object") {
    const o = data as Record<string, unknown>
    if (Array.isArray(o.endpoints)) return o.endpoints
    if (Array.isArray(o.items)) return o.items
    if (Array.isArray(o.data)) return o.data
  }
  return null
}

export function normalizeChannelsList(data: unknown): any[] | null {
  if (data == null) return []
  if (Array.isArray(data)) return data
  if (typeof data === "object") {
    const o = data as Record<string, unknown>
    if (Array.isArray(o.channels)) return o.channels
    if (Array.isArray(o.items)) return o.items
    if (Array.isArray(o.data)) return o.data
  }
  return null
}

/** Portal users list from Asterisk HTTP bridge (`[]` or `{ users: [] }`). */
export function normalizeUsersList(data: unknown): any[] | null {
  if (data == null) return []
  if (Array.isArray(data)) return data
  if (typeof data === "object") {
    const o = data as Record<string, unknown>
    if (Array.isArray(o.users)) return o.users
    if (Array.isArray(o.items)) return o.items
    if (Array.isArray(o.data)) return o.data
  }
  return null
}

/**
 * Next free numeric extension (1000–9999) when `/nextextension` is missing.
 */
export function suggestNextExtension(
  users: { extension?: string }[],
  endpointRows: { resource?: string; extension?: string }[]
): string {
  const used = new Set<string>()
  for (const u of users) {
    if (u?.extension != null && u.extension !== "") used.add(String(u.extension))
  }
  for (const ep of endpointRows) {
    const r = ep?.resource ?? ep?.extension
    if (r != null && r !== "") used.add(String(r))
  }
  for (let n = 1000; n <= 9999; n++) {
    const s = String(n)
    if (!used.has(s)) return s
  }
  return String(10000 + Math.floor(Math.random() * 89999))
}

// Fetch live endpoint statuses from Asterisk
export async function fetchLiveEndpoints(): Promise<any[] | null> {
  try {
    const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.endpoints))
    const data = await res.json()
    const list = normalizeEndpointsList(data)
    if (list === null) return null
    return list
  } catch {
    return null
  }
}

// Fetch active calls from Asterisk
export async function fetchActiveCalls(): Promise<any[] | null> {
  try {
    const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.channels))
    const data = await res.json()
    const list = normalizeChannelsList(data)
    if (list === null) return null
    return list
  } catch {
    return null
  }
}

// Fetch server info from Asterisk
export async function fetchServerInfo() {
  try {
    const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.info));
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}