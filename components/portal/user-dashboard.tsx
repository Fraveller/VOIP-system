"use client"

import { useState, useEffect, useCallback } from "react"
import { Phone, PhoneMissed, UserCircle, BookOpen, PhoneCall, Settings, Wifi, Shield, Globe, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { KpiCard } from "./kpi-card"
import { StatusBadge } from "./status-badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "./portal-router"
import {
  ASTERISK_API,
  apiUrl,
  BridgePaths,
  fetchLiveEndpoints,
} from "@/lib/mock-data"
import { usePbxHost } from "@/hooks/use-pbx-host"

export function UserDashboard() {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const [dnd, setDnd]               = useState(false)
  const [forwarding, setForwarding] = useState(false)
  const [isOnline, setIsOnline]     = useState(false)
  const [activeCalls, setActiveCalls] = useState(0)
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const { sipHost: pbxServerHost, sipPort: pbxSipPort, reload: reloadPbxHost } =
    usePbxHost()
  const [lastRefresh, setLastRefresh] = useState("—")

  const fetchData = useCallback(async () => {
    try {
      await reloadPbxHost()
      // Check if my extension is registered
      const endpoints = await fetchLiveEndpoints()
      const list = Array.isArray(endpoints) ? endpoints : []
      if (user?.extension) {
        const myEp = list.find(
          (e: any) =>
            String(e.resource ?? e.extension) === String(user.extension)
        )
        setIsOnline(myEp?.state === "online")
      } else {
        setIsOnline(false)
      }

      // Active calls count
      const chRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.channels))
      const channels = await chRes.json()
      if (Array.isArray(channels)) setActiveCalls(channels.length)

      // Real CDR records
      const cdrRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.realcdr))
      const cdrData = await cdrRes.json()
      if (Array.isArray(cdrData)) {
        // Filter calls involving my extension
        const myCalls = cdrData.filter(
          c => c.caller === user?.extension || c.callee === user?.extension
        )
        setRecentCalls(myCalls.slice(0, 5))
      }

    } catch { }
    setLastRefresh(new Date().toLocaleTimeString())
  }, [user?.extension, reloadPbxHost])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const missedCalls = recentCalls.filter(c => c.type === "Missed").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.name} · {lastRefresh}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="My Extension"
          value={user?.extension || "N/A"}
          icon={Phone}
          trend={isOnline ? "Registered ✅" : "Not Registered ❌"}
          trendUp={isOnline}
        />
        <KpiCard
          title="Missed Calls"
          value={missedCalls}
          icon={PhoneMissed}
          trend="From CDR"
        />
        <KpiCard
          title="Active Calls"
          value={activeCalls}
          icon={PhoneCall}
          trend="System-wide live"
          trendUp
        />
        <KpiCard
          title="Presence"
          value={dnd ? "DND" : isOnline ? "Available" : "Offline"}
          icon={UserCircle}
          trend={dnd ? "Do Not Disturb" : isOnline ? "Softphone connected" : "No softphone"}
          trendUp={!dnd && isOnline}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          type="button"
          className="h-auto flex-col gap-2 bg-primary py-4 text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            navigate("/dashboard/settings")
            toast.info(
              `Open your SIP softphone and register with server ${pbxServerHost ?? "—"}:${pbxSipPort ?? "5060"}, extension ${user?.extension ?? "—"}.`,
            )
          }}
        >
          <Phone className="h-5 w-5" />
          <span className="text-sm font-medium">Launch Softphone</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto flex-col gap-2 py-4 border-border"
          onClick={() => navigate("/dashboard/directory")}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-medium">Open Directory</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto flex-col gap-2 py-4 border-border"
          onClick={() => navigate("/dashboard/my-calls")}
        >
          <PhoneCall className="h-5 w-5" />
          <span className="text-sm font-medium">Call History</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto flex-col gap-2 py-4 border-border"
          onClick={() => navigate("/dashboard/settings")}
        >
          <Settings className="h-5 w-5" />
          <span className="text-sm font-medium">Call Settings</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Calls */}
        <Card className="border border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">My Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No call records yet for extension {user?.extension}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {call.caller === user?.extension ? call.calleeName : call.callerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {call.caller === user?.extension ? call.callee : call.caller} · {call.dateTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{call.duration}</span>
                      <StatusBadge
                        label={call.type}
                        variant={call.type === "Missed" ? "danger" : call.type === "Inbound" ? "info" : "success"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Presence Controls */}
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Presence Controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dnd" className="text-sm">Do Not Disturb</Label>
                <Switch id="dnd" checked={dnd} onCheckedChange={setDnd} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="forwarding" className="text-sm">Call Forwarding</Label>
                <Switch id="forwarding" checked={forwarding} onCheckedChange={setForwarding} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ring Timeout</span>
                <span className="text-sm font-medium">30 seconds</span>
              </div>
            </CardContent>
          </Card>

          {/* Network Status */}
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Extension</span>
                </div>
                <span className="text-sm font-mono font-bold text-foreground">{user?.extension}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">SIP Status</span>
                </div>
                <StatusBadge label={isOnline ? "Registered" : "Unregistered"} variant={isOnline ? "success" : "danger"} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Encryption</span>
                </div>
                <StatusBadge label="TLS/SRTP" variant="success" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">PBX Server</span>
                </div>
                <span className="text-sm font-mono text-foreground" title={`SIP port ${pbxSipPort ?? "5060"}`}>
                  {pbxServerHost ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}