"use client"

import { useEffect, useState } from "react"
import { FileText, RefreshCw, Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ASTERISK_API, apiUrl, BridgePaths } from "@/lib/mock-data"

type AuditLog = {
  id: string
  timestamp: string
  admin: string
  action: string
  target: string
  ip: string
}

export function AuditLogs() {
  const [logs, setLogs]           = useState<AuditLog[]>([])
  const [lastRefresh, setLastRefresh] = useState("—")
  const [loading, setLoading]     = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.audit))
      const data = await res.json()
      if (Array.isArray(data)) setLogs(data)
    } catch {
      setLogs([])
    }
    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }

  useEffect(() => {
    void fetchLogs()
  }, [])

  // ─── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Timestamp", "Admin", "Action", "Target", "IP"]
    const rows = logs.map(l => [l.timestamp, l.admin, l.action, l.target, l.ip])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `udsm-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const actionColor = (action: string) => {
    if (action.includes("Created")) return "bg-green-500/10 text-green-600"
    if (action.includes("Deleted")) return "bg-red-500/10 text-red-600"
    if (action.includes("Suspended")) return "bg-yellow-500/10 text-yellow-600"
    if (action.includes("Modified")) return "bg-blue-500/10 text-blue-600"
    return "bg-primary/10 text-primary"
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            Real-time record of all administrative actions · Last updated: {lastRefresh}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Actions</p>
            <p className="text-3xl font-bold text-foreground mt-1">{logs.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
            <p className="text-3xl font-bold text-green-500 mt-1">
              {logs.filter(l => l.action.includes("Created")).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Deleted</p>
            <p className="text-3xl font-bold text-destructive mt-1">
              {logs.filter(l => l.action.includes("Deleted")).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No audit logs yet. Actions like creating or deleting extensions will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{log.timestamp}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{log.admin}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColor(log.action)}`}>
                          <FileText className="h-3 w-3" />
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{log.target}</td>
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{log.ip}</td>
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