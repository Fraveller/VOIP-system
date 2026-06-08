"use client"

import { useState, useEffect } from "react"
import { Search, PhoneCall, Clock, PhoneMissed, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KpiCard } from "./kpi-card"
import { StatusBadge } from "./status-badge"
import { ASTERISK_API, apiUrl, BridgePaths } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"

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

export function MyCallsPage() {
  const { user } = useAuth()
  const [search, setSearch]         = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [myCalls, setMyCalls]       = useState<CallRecord[]>([])
  const [lastRefresh, setLastRefresh] = useState("—")
  const [loading, setLoading]       = useState(true)

  const fetchMyCalls = async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.realcdr))
      const data = await res.json()
      if (Array.isArray(data)) {
        // Filter only calls involving this user's extension
        const filtered = data.filter(
          (c: CallRecord) => c.caller === user?.extension || c.callee === user?.extension
        )
        setMyCalls(filtered)
      }
    } catch {
      setMyCalls([])
    }
    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }

  useEffect(() => {
    void fetchMyCalls()
  }, [user?.extension])

  const filtered = myCalls.filter((r) => {
    const matchesSearch =
      r.callerName.toLowerCase().includes(search.toLowerCase()) ||
      r.calleeName.toLowerCase().includes(search.toLowerCase()) ||
      r.caller.includes(search) ||
      r.callee.includes(search)
    const matchesType = typeFilter === "all" || r.type.toLowerCase() === typeFilter
    return matchesSearch && matchesType
  })

  const missed = myCalls.filter(r => r.type === "Missed").length
  const total  = myCalls.length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Calls</h2>
          <p className="text-sm text-muted-foreground">
            Call history for extension {user?.extension} · Last updated: {lastRefresh}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMyCalls}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Total Calls"  value={total}  icon={PhoneCall}   trend="My call history" trendUp />
        <KpiCard title="Missed"       value={missed} icon={PhoneMissed} trend={`${Math.round((missed / (total || 1)) * 100)}% miss rate`} trendUp={false} />
        <KpiCard title="My Extension" value={user?.extension ?? "—"} icon={Clock} trend={user?.name ?? ""} trendUp />
      </div>

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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calls Table */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading your call history...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No call records found for extension {user?.extension}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date/Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direction</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => {
                    const isOutgoing = record.caller === user?.extension
                    const contact = isOutgoing ? record.calleeName : record.callerName
                    const contactExt = isOutgoing ? record.callee : record.caller
                    return (
                      <tr key={record.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{record.dateTime}</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            label={isOutgoing ? "Outgoing" : "Incoming"}
                            variant={isOutgoing ? "info" : "success"}
                            dot={false}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{contact}</p>
                            <p className="text-xs text-muted-foreground font-mono">{contactExt}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-foreground">{record.duration}</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            label={record.type}
                            variant={
                              record.type === "Missed"   ? "danger"
                              : record.type === "Inbound"  ? "success"
                              : record.type === "Outbound" ? "info"
                              : "neutral"
                            }
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}