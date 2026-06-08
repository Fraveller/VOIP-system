"use client"

import { useState, useEffect } from "react"
import { Search, PhoneCall, Clock, PhoneMissed, Download, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KpiCard } from "./kpi-card"
import { StatusBadge } from "./status-badge"
import { ASTERISK_API, apiUrl, BridgePaths } from "@/lib/mock-data"

type CallRecord = {
  id: string
  dateTime: string
  caller: string
  callerName: string
  callee: string
  calleeName: string
  duration: string
  type: string
  networkOrigin: string
}

export function CallRecords() {
  const [search, setSearch]         = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [records, setRecords]       = useState<CallRecord[]>([])
  const [activeCalls, setActiveCalls] = useState<CallRecord[]>([])
  const [lastRefresh, setLastRefresh] = useState("—")
  const [loading, setLoading]       = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      // Fetch live active calls
      const liveRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.cdr))
      const liveData = await liveRes.json()
      if (Array.isArray(liveData)) setActiveCalls(liveData)
    } catch {
      setActiveCalls([])
    }

    try {
      // Fetch real historical CDR from Asterisk CSV
      const cdrRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.realcdr))
      const cdrData = await cdrRes.json()
      if (Array.isArray(cdrData)) setRecords(cdrData)
    } catch {
      setRecords([])
    }

    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }

  useEffect(() => {
    void fetchAll()
  }, [])

  // Combine live + historical
  const allRecords = [
    ...activeCalls.map(c => ({ ...c, type: "Active" })),
    ...records,
  ]

  const filtered = allRecords.filter((r) => {
    const matchesSearch =
      r.callerName.toLowerCase().includes(search.toLowerCase()) ||
      r.calleeName.toLowerCase().includes(search.toLowerCase()) ||
      r.caller.includes(search) ||
      r.callee.includes(search)
    const matchesType = typeFilter === "all" || r.type.toLowerCase() === typeFilter
    return matchesSearch && matchesType
  })

  const missed = allRecords.filter(r => r.type === "Missed").length
  const total  = allRecords.length

  // Export CSV
  const exportCSV = () => {
    const headers = ["Date/Time", "Caller", "Caller Name", "Callee", "Callee Name", "Duration", "Type", "Network"]
    const rows = filtered.map(r => [
      r.dateTime, r.caller, r.callerName, r.callee, r.calleeName, r.duration, r.type, r.networkOrigin
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `udsm-cdr-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Call Records (CDR)</h2>
          <p className="text-sm text-muted-foreground">
            Live active calls + historical records · Last updated: {lastRefresh}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Total Records" value={total}              icon={PhoneCall}   trend="Historical + Live" trendUp />
        <KpiCard title="Active Now"    value={activeCalls.length} icon={Clock}       trend="Live from Asterisk" trendUp />
        <KpiCard title="Missed Calls"  value={missed}             icon={PhoneMissed} trend={`${Math.round((missed / (total || 1)) * 100)}% miss rate`} trendUp={false} />
      </div>

      {/* Active Calls Banner */}
      {activeCalls.length > 0 && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-600 font-medium">
          🔴 {activeCalls.length} active call(s) in progress right now
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by caller, callee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input type="date" className="w-full sm:w-40" />
        <Input type="date" className="w-full sm:w-40" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* CDR Table */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading call records from Asterisk...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No call records yet. Records will appear here after calls are made.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date/Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caller</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Callee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Network</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr
                      key={record.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${record.type === "Active" ? "bg-green-500/5" : ""}`}
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">{record.dateTime}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{record.callerName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{record.caller}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{record.calleeName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{record.callee}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-foreground">{record.duration}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={record.type}
                          variant={
                            record.type === "Active"   ? "success"
                            : record.type === "Missed"   ? "danger"
                            : record.type === "Inbound"  ? "info"
                            : record.type === "Outbound" ? "warning"
                            : "neutral"
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={record.networkOrigin ?? "LAN"}
                          variant={record.networkOrigin === "WAN" ? "warning" : "info"}
                          dot={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}