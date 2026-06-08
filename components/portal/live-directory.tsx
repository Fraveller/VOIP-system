"use client"

import { useState, useEffect } from "react"
import { Search, Phone, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "./status-badge"
import {
  fetchLiveEndpoints,
  ASTERISK_API,
  apiUrl,
  BridgePaths,
} from "@/lib/mock-data"
import { usePbxHost } from "@/hooks/use-pbx-host"
import { dialExtension } from "@/lib/sip-dial"
import { consumePortalPageSearch } from "@/lib/portal-search"

type DirectoryEntry = {
  name: string
  extension: string
  department: string
  presence: string
}

const presenceVariant = (presence: string) => {
  switch (presence) {
    case "available": return "success"
    case "busy":      return "danger"
    case "away":      return "warning"
    case "dnd":       return "danger"
    case "offline":   return "neutral"
    default:          return "neutral"
  }
}

export function LiveDirectory() {
  const { sipHost } = usePbxHost()
  const [search, setSearch]           = useState("")
  const [directory, setDirectory]     = useState<DirectoryEntry[]>([])
  const [lastRefresh, setLastRefresh] = useState("—")
  const [loading, setLoading]         = useState(true)

  const fetchDirectory = async () => {
    setLoading(true)

    // Fetch users from server storage
    let serverUsers: any[] = []
    try {
      const usersRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.users))
      const raw = await usersRes.json()
      serverUsers = Array.isArray(raw) ? raw : []
    } catch { }

    const liveData = await fetchLiveEndpoints()
    const liveList = Array.isArray(liveData) ? liveData : []
    const extOf = (ep: any) => String(ep?.resource ?? ep?.extension ?? "").trim()

    if (liveList.length > 0) {
      const merged: DirectoryEntry[] = liveList
        .map((ep: any) => {
          const ext = extOf(ep)
          const matchedUser = serverUsers.find((u: any) => String(u.extension) === ext)
          return {
            name: matchedUser?.name ?? (ext ? `Extension ${ext}` : "Unknown"),
            extension: ext,
            department: matchedUser?.department ?? "—",
            presence: ep.state === "online" ? "available" : "offline",
          }
        })
        .filter((e) => e.extension.length > 0)
      setDirectory(merged)
    } else {
      setDirectory(
        serverUsers.map((u: any) => ({
          name: u.name,
          extension: String(u.extension ?? ""),
          department: u.department,
          presence: "offline",
        }))
      )
    }

    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }

  useEffect(() => {
    void fetchDirectory()
    const preset = consumePortalPageSearch()
    if (preset) setSearch(preset)
  }, [])

  const handleCall = (extension: string) => {
    dialExtension(extension, sipHost)
  }

  const filtered = directory.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.extension.includes(search) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  )

  const available = directory.filter(e => e.presence === "available").length
  const offline   = directory.filter(e => e.presence === "offline").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Extension Directory</h2>
          <p className="text-sm text-muted-foreground">
            Real-time presence from Asterisk · Last updated: {lastRefresh}
          </p>
        </div>
        <div className="flex items-center gap-2">
          
          <Button variant="outline" size="sm" onClick={fetchDirectory}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-3xl font-bold text-foreground mt-1">{directory.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Available</p>
            <p className="text-3xl font-bold text-green-500 mt-1">{available}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Offline</p>
            <p className="text-3xl font-bold text-destructive mt-1">{offline}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, extension, department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading live directory from Asterisk...
            </div>
          ) : directory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No users found. Add users in the Users section first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Extension</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presence</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.extension} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{entry.name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-foreground">{entry.extension}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.department}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={entry.presence}
                          variant={presenceVariant(entry.presence) as "success" | "warning" | "danger" | "info" | "neutral"}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => handleCall(entry.extension)}
                          title={`Call ${entry.extension} via installed softphone`}
                        >
                          <Phone className="mr-1 h-3.5 w-3.5" />
                          Call
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
    </div>
  )
}