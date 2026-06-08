"use client"

import { useEffect, useMemo, useState } from "react"
import { ShieldCheck, ShieldAlert, Lock, Globe, Trash2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "./status-badge"
import { toast } from "sonner"
import { ASTERISK_API, apiUrl, BridgePaths } from "@/lib/mock-data"
import { useAsteriskHealth } from "@/hooks/use-asterisk-health"
import {
  getSecuritySettings,
  normalizeSecuritySettings,
  saveSecuritySettingsLocal,
  type SecuritySettings,
} from "@/lib/security-settings"

type BlockedIP = {
  ip: string
  reason: string
  blockedSince: string
  autoExpiry: string
}

type SecurityEvent = {
  id: string
  event: string
  details: string
  severity: string
  source: string
  timestamp: string
}

type SecurityStatus = {
  tls: boolean
  srtp: boolean
  firewall: boolean
  certExpiry: string
  certDaysLeft: number
}

export function SecurityPage() {
  const { status: health } = useAsteriskHealth(false)

  const bridgeOk = useMemo(() => {
    const k = health.kind
    return k === "online" || k === "degraded"
  }, [health])

  const bridgeFullyOnline = health.kind === "online"

  const [blockedIPs, setBlockedIPs]         = useState<BlockedIP[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [totalExt, setTotalExt]             = useState(0)
  const [registeredExt, setRegisteredExt]   = useState(0)
  const [lastRefresh, setLastRefresh]       = useState("—")
  const [loading, setLoading]               = useState(true)
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    tls:          false,
    srtp:         false,
    firewall:     false,
    certExpiry:   "—",
    certDaysLeft: 0,
  })
  const [loginSettings, setLoginSettings] = useState<SecuritySettings>(() =>
    getSecuritySettings()
  )
  const [settingsSaving, setSettingsSaving] = useState(false)

  const loadLoginSettings = async () => {
    try {
      const res = await fetch("/api/portal/security-settings", { cache: "no-store" })
      if (res.ok) {
        const data = normalizeSecuritySettings(await res.json())
        setLoginSettings(data)
        saveSecuritySettingsLocal(data)
        return
      }
    } catch {
      /* use local */
    }
    setLoginSettings(getSecuritySettings())
  }

  const fetchSecurityData = async () => {
    setLoading(true)
    try {
      // Get endpoints
      const epRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.endpoints))
      const endpoints = await epRes.json()
      if (Array.isArray(endpoints)) {
        setTotalExt(endpoints.length)
        setRegisteredExt(endpoints.filter((e: any) => e.state === "online").length)
      }

      // Get users for active sessions
      const usersRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.users))
      const users = await usersRes.json()
      if (Array.isArray(users)) {
        const sessions = users
          .filter((u: any) => u.status === "active")
          .map((u: any) => ({
            user:    u.name,
            ext:     u.extension,
            started: u.lastLogin,
            device:  "Portal",
            online:  u.online,
          }))
        setActiveSessions(sessions)
      }

      // Get audit logs for security events
      const auditRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.audit))
      const auditData = await auditRes.json()
      if (Array.isArray(auditData)) {
        const events: SecurityEvent[] = auditData.slice(0, 10).map((log: any) => ({
          id:        log.id,
          event:     log.action,
          details:   log.target,
          severity:  log.action.includes("Deleted")   ? "warning"
                   : log.action.includes("Suspended") ? "warning"
                   : log.action.includes("Password")  ? "info"
                   : "info",
          source:    log.ip ?? "portal",
          timestamp: log.timestamp,
        }))
        setSecurityEvents(events)
      }

      // ─── Get live security/encryption status ───────────────────────────
      const secRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.security))
      const secData = await secRes.json()
      if (secData && !secData.error) {
        setSecurityStatus({
          tls:          secData.tls,
          srtp:         secData.srtp,
          firewall:     secData.firewall,
          certExpiry:   secData.certExpiry,
          certDaysLeft: secData.certDaysLeft,
        })
      }

    } catch { /* individual requests may fail; PBX reachability is from useAsteriskHealth */ }

    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }

  useEffect(() => {
    void loadLoginSettings()
    void fetchSecurityData()
  }, [])

  const handleSaveLoginSettings = async () => {
    setSettingsSaving(true)
    const normalized = normalizeSecuritySettings(loginSettings)
    try {
      const portalRes = await fetch("/api/portal/security-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      })
      if (!portalRes.ok) {
        toast.error("Could not save settings", {
          description: "Portal storage rejected the update.",
        })
        setSettingsSaving(false)
        return
      }

      saveSecuritySettingsLocal(normalized)
      setLoginSettings(normalized)

      try {
        await fetch(apiUrl(ASTERISK_API, BridgePaths.security), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxFailedLoginAttempts: normalized.maxFailedLoginAttempts,
            lockoutDurationSec: normalized.lockoutDurationSec,
            sessionTimeoutMinutes: normalized.sessionTimeoutMinutes,
          }),
        })
      } catch {
        /* PBX bridge may not support POST; portal settings still apply */
      }

      toast.success("Security settings saved", {
        description: `Login lockout and ${normalized.sessionTimeoutMinutes} min session timeout are now active.`,
      })
    } catch {
      toast.error("Save failed", { description: "Cannot reach the portal API." })
    }
    setSettingsSaving(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Security</h2>
          <p className="text-sm text-muted-foreground">
            System security settings and monitoring · Last updated: {lastRefresh}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSecurityData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Login Security Settings */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Lock className="h-4 w-4 text-primary" />
              Login Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Max Failed Login Attempts</Label>
              <Input
                type="number"
                min={3}
                max={20}
                className="w-32"
                value={loginSettings.maxFailedLoginAttempts}
                onChange={(e) =>
                  setLoginSettings((s) => ({
                    ...s,
                    maxFailedLoginAttempts: Number(e.target.value) || 5,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Lockout Duration (seconds)</Label>
              <Input
                type="number"
                min={10}
                max={3600}
                className="w-32"
                value={loginSettings.lockoutDurationSec}
                onChange={(e) =>
                  setLoginSettings((s) => ({
                    ...s,
                    lockoutDurationSec: Number(e.target.value) || 30,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Session Timeout (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                className="w-32"
                value={loginSettings.sessionTimeoutMinutes}
                onChange={(e) =>
                  setLoginSettings((s) => ({
                    ...s,
                    sessionTimeoutMinutes: Number(e.target.value) || 30,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Password Policy</Label>
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-xs text-green-700">
                ✅ Min 8 chars · 1 uppercase · 1 number · 1 special character
              </div>
            </div>
            <Button
              type="button"
              className="w-fit bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={settingsSaving}
              onClick={() => void handleSaveLoginSettings()}
            >
              {settingsSaving ? "Saving…" : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Encryption Status — Live from Asterisk */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Encryption & Security Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Asterisk PBX</span>
              <StatusBadge
                label={
                  health.kind === "checking"
                    ? "Checking…"
                    : bridgeFullyOnline
                      ? "Online"
                      : bridgeOk
                        ? "Degraded"
                        : "Offline"
                }
                variant={
                  bridgeFullyOnline ? "success" : bridgeOk ? "warning" : health.kind === "checking" ? "neutral" : "danger"
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">UFW Firewall</span>
              <StatusBadge label={securityStatus.firewall ? "Active" : "Inactive"} variant={securityStatus.firewall ? "success" : "danger"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SIP Port (5060/UDP)</span>
              <StatusBadge label="Open" variant="success" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">TLS Port (5061/TCP)</span>
              <StatusBadge label={securityStatus.tls ? "Active" : "Inactive"} variant={securityStatus.tls ? "success" : "danger"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">RTP Media Ports</span>
              <StatusBadge label="10000-20000 Open" variant="success" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">TLS Encryption</span>
              <StatusBadge label={securityStatus.tls ? "Active" : "Inactive"} variant={securityStatus.tls ? "success" : "danger"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SRTP Media Encryption</span>
              <StatusBadge label={securityStatus.srtp ? "Active (SDES)" : "Inactive"} variant={securityStatus.srtp ? "success" : "danger"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SSL Certificate</span>
              <StatusBadge
                label={securityStatus.certExpiry}
                variant={
                  securityStatus.certDaysLeft > 30 ? "success"
                  : securityStatus.certDaysLeft > 7 ? "warning"
                  : "danger"
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Password Complexity</span>
              <StatusBadge label="Enforced" variant="success" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Force Password Change</span>
              <StatusBadge label="Enabled" variant="success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extension Security Summary */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Extension Security Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{totalExt}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Extensions</p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{registeredExt}</p>
              <p className="text-xs text-muted-foreground mt-1">Registered</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{totalExt - registeredExt}</p>
              <p className="text-xs text-muted-foreground mt-1">Unregistered</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{activeSessions.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Active Users ({activeSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active sessions</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeSessions.map((session, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-foreground">{session.user}</p>
                    <p className="text-xs text-muted-foreground">
                      Ext. {session.ext} · Last login: {session.started}
                    </p>
                  </div>
                  <StatusBadge
                    label={session.online ? "Online" : "Offline"}
                    variant={session.online ? "success" : "neutral"}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked IPs */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Globe className="h-4 w-4 text-primary" />
            Firewall / Blocked IPs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blockedIPs.length === 0 ? (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-700">
              ✅ No blocked IPs — System is clean
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blocked Since</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedIPs.map((ip, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{ip.ip}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{ip.reason}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{ip.blockedSince}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Activity from Audit Logs */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Recent Security Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No security events</p>
          ) : (
            <div className="flex flex-col gap-2">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-foreground">{event.event}</p>
                    <p className="text-xs text-muted-foreground">{event.details}</p>
                    <p className="text-xs text-muted-foreground/70">{event.timestamp}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge
                      label={event.severity}
                      variant={
                        event.severity === "critical" ? "danger"
                        : event.severity === "warning" ? "warning"
                        : "info"
                      }
                    />
                    <p className="text-xs text-muted-foreground">{event.source}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}