"use client"

import { useEffect, useState } from "react"
import { Users, Phone, PhoneCall, Globe, ShieldCheck, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "./kpi-card"
import { StatusBadge } from "./status-badge"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import {
  ASTERISK_API,
  apiUrl,
  BridgePaths,
  fetchLiveEndpoints,
  fetchActiveCalls,
} from "@/lib/mock-data"

const COLORS = ["var(--primary)", "var(--secondary)"]

export function AdminDashboard() {
  const [totalUsers, setTotalUsers]       = useState(0)
  const [totalExt, setTotalExt]           = useState(0)
  const [registeredExt, setRegisteredExt] = useState(0)
  const [activeCalls, setActiveCalls]     = useState(0)
  const [uptime, setUptime]               = useState("—")
  const [auditLogs, setAuditLogs]         = useState<any[]>([])
  const [lastRefresh, setLastRefresh]     = useState("—")

  // ─── Department breakdown from extensions ────────────────────────────────
  const [deptData, setDeptData] = useState<any[]>([])

  const fetchAll = async () => {
    try {
      const endpoints = await fetchLiveEndpoints()
      if (Array.isArray(endpoints)) {
        setTotalExt(endpoints.length)
        setRegisteredExt(endpoints.filter((e: any) => e.state === "online").length)
      } else {
        setTotalExt(0)
        setRegisteredExt(0)
      }

      // Active calls
      const channels = await fetchActiveCalls()
      if (Array.isArray(channels)) setActiveCalls(channels.length)
      else setActiveCalls(0)

      // System uptime
      const sysRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.system))
      const sysData = await sysRes.json()
      if (sysData) setUptime(sysData.uptime)

      // Users count
      const usersRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.users))
      const usersData = await usersRes.json()
      if (Array.isArray(usersData)) {
        setTotalUsers(usersData.length)

        // Build department breakdown
        const deptMap: Record<string, number> = {}
        usersData.forEach((u: any) => {
          const dept = u.department?.split(" ")[0] ?? "Other"
          deptMap[dept] = (deptMap[dept] || 0) + 1
        })
        setDeptData(Object.entries(deptMap).map(([department, count]) => ({ department, count })))
      } else {
        setTotalUsers(0)
        setDeptData([])
      }

      // Audit logs
      const auditRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.audit))
      const auditData = await auditRes.json()
      if (Array.isArray(auditData)) setAuditLogs(auditData)

    } catch { }
    setLastRefresh(new Date().toLocaleTimeString())
  }

  useEffect(() => {
    void fetchAll()
  }, [])

  const safeTotalExt = Number.isFinite(totalExt) ? totalExt : 0
  const safeRegisteredExt = Number.isFinite(registeredExt) ? registeredExt : 0
  const safeUnregisteredExt = Math.max(0, safeTotalExt - safeRegisteredExt)
  const safeActiveCalls = Number.isFinite(activeCalls) ? activeCalls : 0
  const safeTotalUsers = Number.isFinite(totalUsers) ? totalUsers : 0

  // Network ratio — registered vs unregistered
  const networkRatio = [
    { name: "Registered", value: safeRegisteredExt },
    { name: "Unregistered", value: safeUnregisteredExt },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            VoIP system overview and real-time monitoring · {lastRefresh}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Users"       value={safeTotalUsers}                icon={Users}    trend="Registered in portal" trendUp />
        <KpiCard title="Total Extensions"  value={safeTotalExt}                  icon={Phone}    trend={`${safeUnregisteredExt} unregistered`} />
        <KpiCard title="Active Calls"      value={safeActiveCalls}               icon={PhoneCall} trend="Live from Asterisk" trendUp />
        <KpiCard title="Registered Now"    value={safeRegisteredExt}             icon={Globe}    trend={`of ${safeTotalExt} extensions`} trendUp />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Users per Department */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Users per Department</CardTitle>
          </CardHeader>
          <CardContent>
            {deptData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No users added yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="department" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--card-foreground)" }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Extension Registration Status */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Extension Registration Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={networkRatio}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {networkRatio.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* System Status */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">System Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">TLS/SRTP</span>
              </div>
              <StatusBadge label="Active" variant="success" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Server Uptime</span>
              </div>
              <span className="text-sm font-medium text-foreground">{uptime}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Active Calls</span>
              </div>
              <span className="text-sm font-medium text-foreground">{safeActiveCalls}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Unregistered Ext.</span>
              </div>
              <span className={`text-sm font-medium ${safeUnregisteredExt > 0 ? "text-destructive" : "text-green-500"}`}>
                {safeUnregisteredExt}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Activity */}
        <Card className="border border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No activity yet
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {auditLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.admin} · {log.target}
                    </p>
                    <p className="text-xs text-muted-foreground/70">{log.timestamp}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}