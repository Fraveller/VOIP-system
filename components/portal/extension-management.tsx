"use client"

import { useMemo, useState, useEffect } from "react"
import { Search, Eye, Trash2, RefreshCw, UserPlus, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "./status-badge"
import {
  departments,
  fetchLiveEndpoints,
  ASTERISK_API,
  apiUrl,
  BridgePaths,
} from "@/lib/mock-data"
import { buildExtensionPostBody } from "@/lib/extension-create-payload"
import {
  clearFreedExtension,
  listFreedExtensions,
  recordFreedExtension,
} from "@/lib/freed-extensions"
import { readJsonResponse } from "@/lib/api-client"
import { consumePortalPageSearch } from "@/lib/portal-search"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type LiveEndpoint = {
  extension: string
  assignedUser: string
  department: string
  registrationStatus: string
  network: string
  encryption: string
  lastIp: string
  state: string
}

type PortalUser = {
  id: string
  name: string
  email: string
  department: string
  extension: string
  role: string
}

function generateExtensionPassword(extension: string) {
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  const specials = ["@", "#", "!", "$", "%"]
  const special = specials[Math.floor(Math.random() * specials.length)]
  return `UDSM${special}${extension}#${randomNum}`
}

export function ExtensionManagement() {
  const [search, setSearch] = useState("")
  const [selectedExt, setSelectedExt] = useState<LiveEndpoint | null>(null)
  const [endpoints, setEndpoints] = useState<LiveEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState("—")
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([])
  const [freedExts, setFreedExts] = useState<string[]>([])
  const [showReconfigure, setShowReconfigure] = useState(false)
  const [reconfigLoading, setReconfigLoading] = useState(false)
  const [reconfig, setReconfig] = useState({
    extension: "",
    assignMode: "existing" as "existing" | "new",
    userId: "",
    name: "",
    email: "",
    department: departments[0] ?? "",
    role: "user",
    password: "",
  })

  // ─── Fetch live endpoints from Asterisk ──────────────────────────────────
const fetchEndpoints = async () => {
    setLoading(true)

    // Fetch users from server
    let serverUsers: any[] = []
    try {
      const usersRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.users))
      const rawUsers = await usersRes.json()
      serverUsers = Array.isArray(rawUsers) ? rawUsers : []
    } catch { }

    const liveData = await fetchLiveEndpoints()
    const liveList = Array.isArray(liveData) ? liveData : []

    const extKey = (ep: any) => String(ep?.resource ?? ep?.extension ?? "").trim()

    let merged: LiveEndpoint[] = []
    if (liveList.length > 0) {
      merged = liveList
        .map((ep: any) => {
          const ext = extKey(ep)
          const matchedUser = serverUsers.find(
            (u: any) => String(u.extension) === ext
          )
          return {
            extension: ext,
            assignedUser: matchedUser?.name ?? "Unassigned",
            department: matchedUser?.department ?? "—",
            registrationStatus:
              ep.state === "online" ? "registered" : "unregistered",
            network: "LAN",
            encryption: "TLS/SRTP",
            lastIp: "—",
            state: ep.state ?? "offline",
          }
        })
        .filter((row) => row.extension.length > 0)
    } else if (serverUsers.length > 0) {
      merged = serverUsers
        .filter((u: any) => u.extension != null && String(u.extension).trim() !== "")
        .map((u: any) => ({
          extension: String(u.extension),
          assignedUser: u.name ?? "—",
          department: u.department ?? "—",
          registrationStatus: "unregistered",
          network: "LAN",
          encryption: "TLS/SRTP",
          lastIp: "—",
          state: "offline",
        }))
    }

    setEndpoints(merged)
    setPortalUsers(
      serverUsers.map((u: any) => ({
        id: String(u.id ?? ""),
        name: String(u.name ?? ""),
        email: String(u.email ?? ""),
        department: String(u.department ?? ""),
        extension: String(u.extension ?? ""),
        role: String(u.role ?? "user"),
      }))
    )
    setFreedExts(listFreedExtensions())

    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }

  const unassignedExtensions = useMemo(
    () =>
      endpoints
        .filter((e) => e.assignedUser === "Unassigned")
        .map((e) => e.extension),
    [endpoints]
  )

  const availableToReassign = useMemo(() => {
    const set = new Set<string>([...freedExts, ...unassignedExtensions])
    return Array.from(set).sort((a, b) => Number(a) - Number(b))
  }, [freedExts, unassignedExtensions])

  const usersWithoutExtension = useMemo(
    () => portalUsers.filter((u) => !String(u.extension ?? "").trim()),
    [portalUsers]
  )

  const openReconfigure = (prefillExt?: string) => {
    const ext = prefillExt ?? availableToReassign[0] ?? ""
    const pwd = ext ? generateExtensionPassword(ext) : ""
    setReconfig({
      extension: ext,
      assignMode: usersWithoutExtension.length > 0 ? "existing" : "new",
      userId: usersWithoutExtension[0]?.id ?? "",
      name: "",
      email: "",
      department: departments[0] ?? "",
      role: "user",
      password: pwd,
    })
    setShowReconfigure(true)
  }

  const ensureExtensionOnPbx = async (ext: string, password: string) => {
    const onPbx = endpoints.some((e) => e.extension === ext)
    if (onPbx) return true
    const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.extensions), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildExtensionPostBody(ext, password)),
    })
    return res.ok
  }

  const handleReconfigure = async () => {
    const ext = reconfig.extension.trim()
    if (!ext) {
      toast.error("Extension required", { description: "Enter or select an extension number." })
      return
    }
  const password = reconfig.password.trim() || generateExtensionPassword(ext)

    setReconfigLoading(true)
    try {
      const pbxOk = await ensureExtensionOnPbx(ext, password)
      if (!pbxOk) {
        toast.error("PBX provisioning failed", {
          description: `Could not create extension ${ext} on Asterisk.`,
        })
        setReconfigLoading(false)
        return
      }

      if (reconfig.assignMode === "existing") {
        if (!reconfig.userId) {
          toast.error("Select a user", { description: "Choose a portal user to assign this extension." })
          setReconfigLoading(false)
          return
        }
        const res = await fetch(
          apiUrl(ASTERISK_API, BridgePaths.users, reconfig.userId),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ extension: ext }),
          }
        )
        if (!res.ok) {
          toast.error("User assignment failed", {
            description: `HTTP ${res.status} updating portal user.`,
          })
          setReconfigLoading(false)
          return
        }
      } else {
        if (!reconfig.name.trim() || !reconfig.email.trim() || !reconfig.department) {
          toast.error("User details required", {
            description: "Name, email, and department are required for a new user.",
          })
          setReconfigLoading(false)
          return
        }
        const userRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.users), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: reconfig.name.trim(),
            email: reconfig.email.trim(),
            department: reconfig.department,
            role: reconfig.role,
            extension: ext,
            status: "active",
            password,
            mustChangePassword: true,
          }),
        })
        const parsed = await readJsonResponse(userRes)
        if (!userRes.ok) {
          toast.error("User creation failed", {
            description:
              typeof parsed.object?.error === "string"
                ? String(parsed.object.error)
                : `HTTP ${userRes.status}`,
          })
          setReconfigLoading(false)
          return
        }
      }

      clearFreedExtension(ext)
      toast.success("Extension reconfigured", {
        description:
          reconfig.assignMode === "existing"
            ? `Extension ${ext} assigned to the selected user.`
            : `Extension ${ext} created and assigned to the new user.`,
      })
      setShowReconfigure(false)
      void fetchEndpoints()
    } catch {
      toast.error("Reconfigure failed", { description: "Cannot reach Asterisk API." })
    }
    setReconfigLoading(false)
  }

  useEffect(() => {
    void fetchEndpoints()
    const preset = consumePortalPageSearch()
    if (preset) setSearch(preset)
  }, [])

  // ─── Delete extension + linked portal user ───────────────────────────────
  const handleDelete = async (ext: string) => {
    if (
      !confirm(
        `Delete extension ${ext} from Asterisk and remove any linked portal user?\n\nThis cannot be undone.`
      )
    ) {
      return
    }
    try {
      let linkedUser: { id: string } | null = null
      try {
        const usersRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.users))
        const usersData = await usersRes.json()
        if (Array.isArray(usersData)) {
          linkedUser =
            usersData.find((u: { extension?: string }) => String(u.extension) === ext) ??
            null
        }
      } catch {
        /* continue with extension delete */
      }

      const extRes = await fetch(
        apiUrl(ASTERISK_API, BridgePaths.extensions, encodeURIComponent(ext)),
        { method: "DELETE" }
      )

      if (linkedUser?.id) {
        await fetch(apiUrl(ASTERISK_API, BridgePaths.users, linkedUser.id), {
          method: "DELETE",
        })
      }

      if (extRes.ok) {
        recordFreedExtension(ext)
        setEndpoints((prev) => prev.filter((e) => e.extension !== ext))
        setFreedExts(listFreedExtensions())
        toast.success("Extension deleted", {
          description: linkedUser
            ? `Extension ${ext} and linked user removed.`
            : `Extension ${ext} removed from Asterisk.`,
        })
        void fetchEndpoints()
      } else {
        toast.error("Delete failed", {
          description: `Could not delete extension ${ext} (HTTP ${extRes.status}).`,
        })
      }
    } catch {
      toast.error("Delete failed", { description: "Cannot reach Asterisk API." })
    }
  }

  const filtered = endpoints.filter((ext) =>
    ext.extension.includes(search) ||
    ext.assignedUser.toLowerCase().includes(search.toLowerCase())
  )

  const registered = endpoints.filter(e => e.state === "online").length
  const unregistered = endpoints.filter(e => e.state !== "online").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Extension Management</h2>
          <p className="text-sm text-muted-foreground">Live SIP extensions from Asterisk PBX</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Last updated: {lastRefresh}
          </span>
          <Button variant="outline" size="sm" onClick={() => openReconfigure()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reconfigure / Assign
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchEndpoints()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Extensions</p>
            <p className="text-3xl font-bold text-foreground mt-1">{endpoints.length}</p>
            <p className="text-xs text-muted-foreground mt-1">On Asterisk PBX</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Registered</p>
            <p className="text-3xl font-bold text-green-500 mt-1">{registered}</p>
            <p className="text-xs text-muted-foreground mt-1">Softphone connected</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Unregistered</p>
            <p className="text-3xl font-bold text-destructive mt-1">{unregistered}</p>
            <p className="text-xs text-muted-foreground mt-1">No softphone</p>
          </CardContent>
        </Card>
      </div>

      {availableToReassign.length > 0 && (
        <Card className="border border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Available for reassignment ({availableToReassign.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {availableToReassign.map((ext) => (
              <Button
                key={ext}
                type="button"
                variant="outline"
                size="sm"
                className="font-mono"
                onClick={() => openReconfigure(ext)}
              >
                {ext}
                {freedExts.includes(ext) ? (
                  <span className="ml-1.5 text-[10px] text-amber-700">recycled</span>
                ) : null}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search extensions or users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading live data from Asterisk...
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Extension</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Network</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Encryption</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ext) => (
                  <tr key={ext.extension} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-foreground">{ext.extension}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{ext.assignedUser}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{ext.department}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={ext.registrationStatus}
                        variant={ext.registrationStatus === "registered" ? "success" : "danger"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={ext.network}
                        variant="info"
                        dot={false}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={ext.encryption}
                        variant="success"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedExt(ext)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => void handleDelete(ext.extension)}
                          aria-label={`Delete extension ${ext.extension}`}
                          title="Delete extension"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Reconfigure / assign extension */}
      <Dialog open={showReconfigure} onOpenChange={setShowReconfigure}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Reconfigure extension & assign user
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Extension number</Label>
              {availableToReassign.length > 0 ? (
                <Select
                  value={reconfig.extension}
                  onValueChange={(v) =>
                    setReconfig((r) => ({
                      ...r,
                      extension: v,
                      password: generateExtensionPassword(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select extension" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToReassign.map((ext) => (
                      <SelectItem key={ext} value={ext}>
                        {ext}
                        {freedExts.includes(ext) ? " (recycled)" : " (unassigned)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={reconfig.extension}
                  onChange={(e) =>
                    setReconfig((r) => ({
                      ...r,
                      extension: e.target.value,
                      password: e.target.value
                        ? generateExtensionPassword(e.target.value)
                        : r.password,
                    }))
                  }
                  placeholder="e.g. 1042"
                  className="font-mono"
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>SIP password (for new/recreated extension)</Label>
              <Input
                value={reconfig.password}
                onChange={(e) =>
                  setReconfig((r) => ({ ...r, password: e.target.value }))
                }
                className="font-mono text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Assign to</Label>
              <Select
                value={reconfig.assignMode}
                onValueChange={(v) =>
                  setReconfig((r) => ({
                    ...r,
                    assignMode: v as "existing" | "new",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing" disabled={usersWithoutExtension.length === 0}>
                    Existing user (no extension)
                  </SelectItem>
                  <SelectItem value="new">New portal user</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reconfig.assignMode === "existing" ? (
              <div className="flex flex-col gap-2">
                <Label>Portal user</Label>
                <Select
                  value={reconfig.userId}
                  onValueChange={(v) => setReconfig((r) => ({ ...r, userId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersWithoutExtension.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Full name</Label>
                  <Input
                    value={reconfig.name}
                    onChange={(e) =>
                      setReconfig((r) => ({ ...r, name: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={reconfig.email}
                    onChange={(e) =>
                      setReconfig((r) => ({ ...r, email: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Department</Label>
                  <Select
                    value={reconfig.department}
                    onValueChange={(v) =>
                      setReconfig((r) => ({ ...r, department: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconfigure(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              disabled={reconfigLoading}
              onClick={() => void handleReconfigure()}
            >
              {reconfigLoading ? "Saving…" : "Save & assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extension Detail Modal */}
      <Dialog open={!!selectedExt} onOpenChange={() => setSelectedExt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extension {selectedExt?.extension} Details</DialogTitle>
          </DialogHeader>
          {selectedExt && (
            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Assigned User</p>
                  <p className="text-sm font-medium text-foreground">{selectedExt.assignedUser}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium text-foreground">{selectedExt.department}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SIP Status</p>
                  <StatusBadge
                    label={selectedExt.registrationStatus}
                    variant={selectedExt.registrationStatus === "registered" ? "success" : "danger"}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Protocol</p>
                  <p className="text-sm font-mono text-foreground">PJSIP / UDP</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Network</p>
                  <StatusBadge label={selectedExt.network} variant="info" dot={false} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Encryption</p>
                  <StatusBadge label={selectedExt.encryption} variant="success" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-medium">Remote Access</span>
                <Switch defaultChecked={false} />
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Asterisk PBX Info
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${selectedExt.state === "online" ? "bg-green-500" : "bg-destructive"}`} />
                    <span>State: {selectedExt.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Technology: PJSIP</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Context: internal</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}