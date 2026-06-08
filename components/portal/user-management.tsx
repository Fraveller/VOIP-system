"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit, UserX, RefreshCw, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "./status-badge"
import {
  departments,
  ASTERISK_API,
  apiUrl,
  BridgePaths,
  fetchLiveEndpoints,
  suggestNextExtension,
} from "@/lib/mock-data"
import {
  usersFromApiRead,
  userFromCreateResponse,
  nextExtensionFromRead,
} from "@/lib/asterisk-users"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { readJsonResponse, formatApiFailure } from "@/lib/api-client"
import { buildExtensionPostBody } from "@/lib/extension-create-payload"
import { consumePortalPageSearch } from "@/lib/portal-search"

type User = {
  id: string
  name: string
  email: string
  department: string
  role: string
  extension: string
  status: string
  lastLogin: string
  online?: boolean
  password?: string
  mustChangePassword?: boolean
}

export function UserManagement() {
  const [search, setSearch]           = useState("")
  const [deptFilter, setDeptFilter]   = useState("all")
  const [showModal, setShowModal]     = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [usersList, setUsersList]     = useState<User[]>([])
  const [loading, setLoading]         = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError]             = useState("")
  const [success, setSuccess]         = useState("")
  const [editError, setEditError]     = useState("")
  const [editSuccess, setEditSuccess] = useState("")
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [lastRefresh, setLastRefresh] = useState("—")

  const [form, setForm] = useState({
    name: "", email: "", department: "", role: "user", extension: "", remoteAccess: false,
  })

  const [editForm, setEditForm] = useState({
    name: "", email: "", department: "", role: "user",
  })

  // ─── Generate strong password ─────────────────────────────────────────────
  const generatePassword = (extension: string) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const specials  = ["@", "#", "!", "$", "%"]
    const special   = specials[Math.floor(Math.random() * specials.length)]
    return `UDSM${special}${extension}#${randomNum}`
  }

  const rowToUser = (u: unknown): User => {
    const r = u as Record<string, unknown>
    return {
      id: String(r.id ?? ""),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      department: String(r.department ?? ""),
      role: String(r.role ?? "user"),
      extension: String(r.extension ?? ""),
      status: String(r.status ?? "active"),
      lastLogin: String(r.lastLogin ?? "—"),
      online: false,
      mustChangePassword: Boolean(r.mustChangePassword),
    }
  }

  // ─── Load users from Asterisk HTTP bridge (PBX database via your API) ─────
  const loadUsers = async () => {
    setPageLoading(true)
    try {
      const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.users), {
        cache: "no-store",
      })
      const parsed = await readJsonResponse(res)
      const rows = usersFromApiRead(parsed)
      if (res.ok) {
        setUsersList(rows.map(rowToUser))
      } else {
        setUsersList([])
      }
    } catch {
      setUsersList([])
    }
    setPageLoading(false)
  }

  // ─── Sync online status ───────────────────────────────────────────────────
  const syncOnlineStatus = async () => {
    const endpoints = await fetchLiveEndpoints()
    const list = Array.isArray(endpoints) ? endpoints : []
    setUsersList(prev =>
      prev.map(u => {
        const ep = list.find(
          (e: any) =>
            String(e.resource ?? e.extension) === String(u.extension)
        )
        return ep
          ? { ...u, online: ep.state === "online" }
          : { ...u, online: false }
      })
    )
    setLastRefresh(new Date().toLocaleTimeString())
  }

  useEffect(() => {
    void loadUsers().then(() => syncOnlineStatus())
    const preset = consumePortalPageSearch()
    if (preset) setSearch(preset)
  }, [])

  // ─── Next extension: Asterisk bridge first, then client-side suggestion ──
  const fetchNextExtension = async () => {
    try {
      const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.nextExtension), {
        cache: "no-store",
      })
      const parsed = await readJsonResponse(res)
      const next = nextExtensionFromRead(parsed)
      if (res.ok && next) {
        setForm((f) => ({ ...f, extension: next }))
        setGeneratedPassword(generatePassword(next))
        return
      }
    } catch {
      /* fallback */
    }

    try {
      const usersRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.users), {
        cache: "no-store",
      })
      const parsed = await readJsonResponse(usersRes)
      const rawUsers = usersFromApiRead(parsed)
      const users = rawUsers.map((u) => rowToUser(u))
      const eps = await fetchLiveEndpoints()
      const epRows = Array.isArray(eps) ? eps : []
      const next = suggestNextExtension(users, epRows)
      setForm((f) => ({ ...f, extension: next }))
      setGeneratedPassword(generatePassword(next))
    } catch {
      setForm((f) => ({ ...f, extension: "1000" }))
      setGeneratedPassword(generatePassword("1000"))
    }
  }

  const filtered = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesDept = deptFilter === "all" || u.department === deptFilter
    return matchesSearch && matchesDept
  })

  const totalUsers     = usersList.length
  const activeUsers    = usersList.filter(u => u.status === "active").length
  const onlineUsers    = usersList.filter(u => u.online).length
  const suspendedUsers = usersList.filter(u => u.status === "suspended").length

  // ─── Open Edit Modal ──────────────────────────────────────────────────────
  const openEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({
      name:       user.name,
      email:      user.email,
      department: user.department,
      role:       user.role,
    })
    setEditError("")
    setEditSuccess("")
    setShowEditModal(true)
  }

  // ─── Save Edit ────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.email) {
      setEditError("Name and email are required")
      return
    }
    setEditLoading(true)
    setEditError("")
    const uid = editingUser?.id
    if (!uid) {
      setEditLoading(false)
      return
    }

    try {
      const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.users, uid), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          department: editForm.department,
          role: editForm.role,
        }),
      })
      const parsed = await readJsonResponse(res)
      if (res.ok) {
        const merged = userFromCreateResponse(parsed, {
          ...editingUser,
          name: editForm.name,
          email: editForm.email,
          department: editForm.department,
          role: editForm.role,
        } as Record<string, unknown>)
        const u = rowToUser(merged)
        setUsersList((prev) =>
          prev.map((row) =>
            row.id === uid ? { ...row, ...u } : row
          )
        )
        setEditSuccess("✅ User updated on Asterisk.")
        setTimeout(() => {
          setShowEditModal(false)
          setEditSuccess("")
        }, 1500)
      } else {
        setEditError(
          formatApiFailure(res, parsed.object, parsed.text, "Failed to update user")
        )
      }
    } catch {
      setEditError("Cannot reach the Asterisk API.")
    }
    setEditLoading(false)
  }

  // ─── Create User ──────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!form.name || !form.email || !form.department) {
      setError("Please fill in all required fields")
      return
    }
    if (!form.extension?.trim()) {
      setError("Extension is not ready yet — wait a moment or reopen Add User.")
      return
    }
    setLoading(true)
    setError("")
    setSuccess("")
    const password = generatedPassword || generatePassword(form.extension)
    const newUser: User = {
      id: String(Date.now()),
      name: form.name,
      email: form.email,
      department: form.department,
      role: form.role,
      extension: form.extension.trim(),
      status: "active",
      lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
      online: false,
      password,
      mustChangePassword: true,
    }

    const finishSuccess = (msg: string) => {
      setSuccess(msg)
      setForm({
        name: "",
        email: "",
        department: "",
        role: "user",
        extension: "",
        remoteAccess: false,
      })
      setGeneratedPassword("")
      fetchNextExtension()
      setTimeout(() => {
        setShowModal(false)
        setSuccess("")
      }, 8000)
    }

    try {
      const extRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.extensions), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildExtensionPostBody(newUser.extension, password)),
      })
      const extParsed = await readJsonResponse(extRes)
      if (!extRes.ok) {
        setError(
          formatApiFailure(
            extRes,
            extParsed.object,
            extParsed.text,
            "Failed to create SIP extension on Asterisk (POST /extensions)"
          )
        )
        setLoading(false)
        return
      }

      const userRes = await fetch(apiUrl(ASTERISK_API, BridgePaths.users), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      const userParsed = await readJsonResponse(userRes)

      if (userRes.status === 409) {
        setError(
          typeof userParsed.object?.error === "string"
            ? String(userParsed.object.error)
            : "A user with this email already exists."
        )
        setLoading(false)
        return
      }

      if (!userRes.ok) {
        setError(
          formatApiFailure(
            userRes,
            userParsed.object,
            userParsed.text,
            "Failed to create portal user on Asterisk (POST /users)"
          )
        )
        setLoading(false)
        return
      }

      const merged = userFromCreateResponse(userParsed, newUser as unknown as Record<string, unknown>)
      const created = rowToUser(merged)

      setUsersList((prev) => {
        const key = created.email.trim().toLowerCase()
        const rest = prev.filter((u) => u.email.trim().toLowerCase() !== key)
        return [...rest, { ...created, online: false }]
      })

      finishSuccess(
        `✅ User created on Asterisk backend.\nExtension: ${created.extension}\nPassword: ${password}\n⚠️ User must change password on first login.`
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? `Cannot reach Asterisk API: ${e.message}`
          : "Cannot reach Asterisk API."
      )
    }
    setLoading(false)
  }

  // ─── Suspend/Activate ─────────────────────────────────────────────────────
  const toggleSuspend = async (user: User) => {
    const newStatus = user.status === "active" ? "suspended" : "active"
    if (!confirm(`${newStatus === "suspended" ? "Suspend" : "Activate"} ${user.name}?`)) return
    try {
      const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.users, user.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, status: newStatus, online: false }
              : u
          )
        )
      } else {
        alert("Failed to update status on Asterisk API.")
      }
    } catch {
      alert("Cannot reach Asterisk API.")
    }
  }

  // ─── Delete User ──────────────────────────────────────────────────────────
  const handleDelete = async (user: User) => {
    if (!confirm(`Permanently delete ${user.name} (Ext. ${user.extension}) from portal and Asterisk?\n\nThis cannot be undone.`)) return
    try {
      const extDel = await fetch(
        apiUrl(
          ASTERISK_API,
          BridgePaths.extensions,
          encodeURIComponent(user.extension)
        ),
        { method: "DELETE" }
      )
      const userDel = await fetch(apiUrl(ASTERISK_API, BridgePaths.users, user.id), {
        method: "DELETE",
      })
      if (userDel.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== user.id))
      } else {
        alert(
          `Delete incomplete (extension HTTP ${extDel.status}, user HTTP ${userDel.status}).`
        )
      }
    } catch {
      alert("Cannot reach Asterisk API.")
    }
  }

  const openAddUser = () => {
    setShowModal(true)
    void fetchNextExtension()
  }

  return (
    <div className="flex flex-col gap-6 pb-20 sm:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Users from Asterisk HTTP API (your bridge → PBX DB) · {lastRefresh}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Button variant="outline" size="sm" onClick={() => { loadUsers(); syncOnlineStatus(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={openAddUser}
            className="bg-secondary font-semibold text-secondary-foreground shadow-md ring-2 ring-secondary/40 hover:bg-secondary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="flex gap-2 sm:hidden">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => { loadUsers(); syncOnlineStatus(); }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Users</p>
            <p className="text-3xl font-bold text-foreground mt-1">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
            <p className="text-3xl font-bold text-green-500 mt-1">{activeUsers}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Online Now</p>
            <p className="text-3xl font-bold text-primary mt-1">{onlineUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">Live from Asterisk</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Suspended</p>
            <p className="text-3xl font-bold text-destructive mt-1">{suspendedUsers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {pageLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading users from server...</div>
          ) : usersList.length === 0 ? (
            <div className="flex flex-col items-center gap-4 p-8 text-center text-muted-foreground text-sm">
              <p>No users yet. Create the first portal user below.</p>
              <Button
                onClick={openAddUser}
                size="lg"
                className="h-12 rounded-xl bg-secondary px-8 font-bold text-secondary-foreground shadow-lg ring-2 ring-secondary/50 hover:bg-secondary/90 sm:hidden"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add New User
              </Button>
              <p className="hidden sm:block">
                Click <strong>Add User</strong> above to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Extension</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Login</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{user.name}</p>
                            {user.mustChangePassword && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded px-1.5 py-0.5">
                                Must change pwd
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{user.department}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={user.role} variant={user.role === "admin" ? "info" : "neutral"} dot={false} />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-foreground">{user.extension}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={user.status} variant={user.status === "active" ? "success" : "danger"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${user.online ? "bg-green-500" : "bg-muted-foreground"}`} />
                          <span className="text-xs text-muted-foreground">{user.online ? "Online" : "Offline"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{user.lastLogin}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(user)}
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className={`h-8 w-8 ${user.status === "active" ? "text-muted-foreground hover:text-amber-500" : "text-amber-500 hover:text-green-500"}`}
                            onClick={() => toggleSuspend(user)}
                            title={user.status === "active" ? "Suspend user" : "Activate user"}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(user)}
                            title="Delete user and extension from Asterisk"
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

      {/* ── Edit User Modal ─────────────────────────────────────────────────── */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User — Ext. {editingUser?.extension}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {editError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {editError}
              </div>
            )}
            {editSuccess && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-600">
                {editSuccess}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Full Name *</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                placeholder="name@udsm.ac.tz"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Department</Label>
              <Select value={editForm.department} onValueChange={v => setEditForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Extension</Label>
              <Input value={editingUser?.extension || ""} disabled className="bg-muted font-mono font-bold" />
              <p className="text-xs text-muted-foreground">Extension cannot be changed</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveEdit}
              disabled={editLoading}
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        onClick={openAddUser}
        aria-label="Add new user"
        className="fixed bottom-5 left-4 right-4 z-40 flex h-14 items-center justify-center gap-2 rounded-2xl bg-secondary text-base font-bold text-secondary-foreground shadow-[0_8px_24px_rgba(0,0,0,0.25)] ring-2 ring-secondary/60 hover:bg-secondary/90 sm:hidden"
      >
        <Plus className="h-6 w-6" />
        Add New User
      </Button>

      {/* ── Add User Modal ──────────────────────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-600 whitespace-pre-line">
                {success}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Full Name *</Label>
              <Input placeholder="Enter full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Email Address *</Label>
              <Input placeholder="name@udsm.ac.tz" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Department *</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select defaultValue="user" onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Auto-assigned Extension</Label>
              <Input value={form.extension || "Loading..."} disabled className="bg-muted font-mono font-bold text-lg" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Auto-generated Password</Label>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                <p className="text-sm font-mono font-bold text-amber-700">{generatedPassword || "Loading..."}</p>
                <p className="text-xs text-amber-600 mt-1">⚠️ Share this with the user. They must change it on first login.</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable Remote Access</Label>
              <Switch checked={form.remoteAccess} onCheckedChange={v => setForm(f => ({ ...f, remoteAccess: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreateUser}
              disabled={loading || !form.extension}
            >
              {loading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}