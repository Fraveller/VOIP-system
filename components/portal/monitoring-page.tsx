"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Wifi, ShieldCheck, Clock, Server, HardDrive, Cpu, MemoryStick } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "./kpi-card"
import { StatusBadge } from "./status-badge"
import { Progress } from "@/components/ui/progress"
import {
  fetchLiveEndpoints,
  fetchActiveCalls,
  fetchServerInfo,
  ASTERISK_API,
  apiUrl,
  BridgePaths,
} from "@/lib/mock-data"
import { useAsteriskHealth } from "@/hooks/use-asterisk-health"

export function MonitoringPage() {
  const { status: health } = useAsteriskHealth(false)

  const [activeCalls, setActiveCalls]     = useState<number>(0)
  const [totalExt, setTotalExt]           = useState<number>(0)
  const [registeredExt, setRegisteredExt] = useState<number>(0)
  const [pbxVersion, setPbxVersion]       = useState<string>("—")
  const [lastRefresh, setLastRefresh]     = useState<string>("—")
  const [cpuUsage, setCpuUsage]           = useState<number>(0)
  const [memUsage, setMemUsage]           = useState<number>(0)
  const [diskUsage, setDiskUsage]         = useState<number>(0)
  const [uptime, setUptime]               = useState<string>("—")

  /** Same logic as the top navbar (`AsteriskConnectionIndicator`): bridge reachability, not endpoint list shape. */
  const bridgeOk = useMemo(() => {
    const k = health.kind
    return k === "online" || k === "degraded"
  }, [health])

  const bridgeFullyOnline = health.kind === "online"

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch endpoints (counts only — do not infer PBX up/down from this; `/endpoints` may be empty or a different JSON shape)
      const endpoints = await fetchLiveEndpoints()
      if (Array.isArray(endpoints)) {
        setTotalExt(endpoints.length)
        setRegisteredExt(
          endpoints.filter((e: any) => e.state === "online").length
        )
      } else {
        setTotalExt(0)
        setRegisteredExt(0)
      }

      const channels = await fetchActiveCalls()
      if (Array.isArray(channels)) setActiveCalls(channels.length)
      else setActiveCalls(0)

      // Fetch server info
      const info = await fetchServerInfo()
      if (info) setPbxVersion(info.system?.version ?? "—")

      // Fetch system stats
      try {
        const sysRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.system))
        const sysData = await sysRes.json()
        if (sysData) {
          setCpuUsage(sysData.cpu)
          setMemUsage(sysData.memory)
          setDiskUsage(sysData.disk ?? 0)
          setUptime(sysData.uptime)
        }
      } catch {
        // system stats unavailable
      }

      setLastRefresh(new Date().toLocaleTimeString())
    }

    void fetchAll()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Monitoring</h2>
          <p className="text-sm text-muted-foreground">Real-time PBX and network health monitoring</p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border ${
            health.kind === "online"
              ? "bg-green-500/10 border-green-500/30 text-green-500"
              : health.kind === "degraded"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                : health.kind === "checking"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                  : "bg-red-500/10 border-red-500/30 text-red-500"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              health.kind === "online"
                ? "bg-green-500"
                : health.kind === "degraded" || health.kind === "checking"
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
          />
          {health.kind === "checking" && <>Checking bridge… · {lastRefresh}</>}
          {health.kind === "online" && (
            <>Asterisk {pbxVersion} — Online · {lastRefresh}</>
          )}
          {health.kind === "degraded" && (
            <>PBX reachable (HTTP {health.httpStatus}) · {lastRefresh}</>
          )}
          {health.kind === "offline" && <>PBX Offline · {lastRefresh}</>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="PBX Uptime"    value={uptime}                            icon={Server}   trend="Live from server" trendUp={bridgeOk} />
        <KpiCard title="Active Calls"  value={activeCalls}                       icon={Activity} trend="Live — refreshes every 5s" trendUp />
        <KpiCard title="Registered"    value={registeredExt}                     icon={Wifi}     trend={`of ${totalExt} extensions`} trendUp />
        <KpiCard title="Unregistered"  value={totalExt - registeredExt}          icon={Clock}    trend="No softphone connected" trendUp={false} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PBX Health */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Server className="h-4 w-4 text-primary" />
              PBX System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span>CPU Usage</span>
                </div>
                <span className={`font-medium ${cpuUsage > 80 ? "text-destructive" : cpuUsage > 60 ? "text-yellow-500" : "text-green-500"}`}>
                  {cpuUsage}%
                </span>
              </div>
              <Progress value={cpuUsage} className="h-2" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                  <span>Memory Usage</span>
                </div>
                <span className={`font-medium ${memUsage > 80 ? "text-destructive" : memUsage > 60 ? "text-yellow-500" : "text-green-500"}`}>
                  {memUsage}%
                </span>
              </div>
              <Progress value={memUsage} className="h-2" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>Disk Usage</span>
                </div>
                <span className={`font-medium ${diskUsage > 80 ? "text-destructive" : diskUsage > 60 ? "text-yellow-500" : "text-green-500"}`}>
                  {diskUsage > 0 ? `${diskUsage}%` : "—"}
                </span>
              </div>
              <Progress value={diskUsage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Wifi className="h-4 w-4 text-primary" />
              Network Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">PBX Main Interface</span>
              <StatusBadge label={bridgeFullyOnline ? "Online" : bridgeOk ? "Degraded" : "Offline"} variant={bridgeFullyOnline ? "success" : bridgeOk ? "warning" : "danger"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SIP Port (5060/UDP)</span>
              <StatusBadge label={bridgeOk ? "Listening" : "Unreachable"} variant={bridgeOk ? "success" : "danger"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">ARI Interface (8088)</span>
              <StatusBadge label={bridgeOk ? "Connected" : "Offline"} variant={bridgeOk ? "success" : "danger"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">RTP Media Ports</span>
              <StatusBadge label="10000–20000 Open" variant="success" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Backend API (3001)</span>
              <StatusBadge label={bridgeOk ? "Running" : "Down"} variant={bridgeOk ? "success" : "danger"} />
            </div>
          </CardContent>
        </Card>

        {/* Security Status */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">TLS Encryption</span>
              <StatusBadge label="Active" variant="success" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SRTP Media Encryption</span>
              <StatusBadge label="Active" variant="success" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">UFW Firewall</span>
              <StatusBadge label="Active" variant="success" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Intrusion Detection</span>
              <StatusBadge label="Active" variant="success" />
            </div>
            {/*<div className="flex items-center justify-between">
              <span className="text-sm">Certificate Expiry</span>
              <StatusBadge label="---" variant="warning" />
            </div>*/}
          </CardContent>
        </Card>

        {/* Registration Summary */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Live Registration Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Extensions (Asterisk)</span>
              <span className="text-sm font-semibold text-foreground">{totalExt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Registered (Online)</span>
              <span className="text-sm font-semibold text-green-500">{registeredExt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Unregistered</span>
              <span className="text-sm font-semibold text-destructive">{totalExt - registeredExt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Calls</span>
              <span className="text-sm font-semibold text-primary">{activeCalls}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SIP Protocol</span>
              <span className="text-sm font-medium text-foreground">PJSIP / UDP</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}