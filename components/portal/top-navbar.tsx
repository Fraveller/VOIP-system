"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, Search, LogOut, ChevronDown, CheckCheck, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { AsteriskConnectionIndicator } from "./asterisk-connection-indicator"
import {
  fetchPortalNotifications,
  markAllNotificationsAsRead,
  unreadCount,
  type PortalNotification,
} from "@/lib/portal-notifications"
import {
  ASTERISK_API,
  apiUrl,
  BridgePaths,
  normalizeUsersList,
} from "@/lib/mock-data"
import {
  filterSearchHits,
  setPortalPageSearch,
  type PortalSearchHit,
} from "@/lib/portal-search"
import { cn } from "@/lib/utils"

type Props = {
  onNavigate?: (page: string) => void
}

export function TopNavbar({ onNavigate }: Props) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === "admin"
  const [notifications, setNotifications] = useState<PortalNotification[]>([])
  const [unread, setUnread] = useState(0)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchHits, setSearchHits] = useState<PortalSearchHit[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [allUsers, setAllUsers] = useState<
    Array<{
      id?: string
      name?: string
      email?: string
      extension?: string
      department?: string
    }>
  >([])
  const searchRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    const notifs = await fetchPortalNotifications(isAdmin)
    setNotifications(notifs)
    setUnread(unreadCount(notifs))
  }

  const loadUsersForSearch = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.users), {
        cache: "no-store",
      })
      const data = await res.json()
      const list = normalizeUsersList(data)
      setAllUsers(Array.isArray(list) ? list : [])
    } catch {
      setAllUsers([])
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      void fetchNotifications()
    }
    void loadUsersForSearch()
  }, [isAdmin, loadUsersForSearch])

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchHits([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    const timer = window.setTimeout(() => {
      setSearchHits(filterSearchHits(allUsers, q))
      setSearchLoading(false)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchQuery, allUsers])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(notifications)
    setUnread(0)
  }

  const openNotificationsPage = () => {
    onNavigate?.("/dashboard/notifications")
  }

  const goToSearchResult = (hit: PortalSearchHit) => {
    const q = hit.extension !== "—" ? hit.extension : hit.name
    setPortalPageSearch(q)
    setSearchQuery(q)
    setSearchOpen(false)

    if (isAdmin) {
      if (hit.kind === "user" && hit.name !== `Extension ${hit.extension}`) {
        onNavigate?.("/dashboard/users")
      } else {
        onNavigate?.("/dashboard/extensions")
      }
    } else {
      onNavigate?.("/dashboard/directory")
    }
  }

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchOpen(false)
      return
    }
    if (e.key === "Enter" && searchHits.length > 0) {
      e.preventDefault()
      goToSearchResult(searchHits[0])
    }
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-primary px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src="/images/udsm-logo.png"
          alt="UDSM Logo"
          width={40}
          height={40}
        />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-primary-foreground hidden md:block">
            Secure VoIP Portal
          </h1>
          <h1 className="text-sm font-semibold text-primary-foreground md:hidden">
            VoIP Portal
          </h1>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <AsteriskConnectionIndicator variant="compact" />

        <div ref={searchRef} className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/60"
            aria-hidden
          />
          <Input
            type="search"
            role="combobox"
            aria-expanded={searchOpen}
            aria-controls="global-search-results"
            aria-label="Search users and extensions"
            placeholder="Search name or extension…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={onSearchKeyDown}
            className="w-72 rounded-xl border-primary-foreground/25 bg-primary-foreground/10 pl-9 text-primary-foreground placeholder:text-primary-foreground/55 focus-visible:border-secondary/60 focus-visible:bg-primary-foreground/15 focus-visible:ring-secondary/40"
          />

          {searchOpen && searchQuery.trim() && (
            <div
              id="global-search-results"
              role="listbox"
              className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            >
              {searchLoading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
              ) : searchHits.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No users or extensions match &quot;{searchQuery.trim()}&quot;
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto py-1">
                  {searchHits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
                        onClick={() => goToSearchResult(hit)}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            hit.kind === "user"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary/20 text-secondary-foreground"
                          )}
                        >
                          {hit.kind === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {hit.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            Ext. {hit.extension}
                            {hit.department ? ` · ${hit.department}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-primary-foreground hover:bg-primary-foreground/10 sm:inline-flex"
              onClick={handleMarkAllRead}
              disabled={notifications.length === 0 || unread === 0}
            >
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-primary-foreground hover:bg-primary-foreground/10"
              onClick={openNotificationsPage}
              aria-label="Open all notifications page"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive p-0 text-[10px] text-primary-foreground">
                  {unread}
                </Badge>
              )}
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-medium text-primary-foreground">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-primary-foreground/70 capitalize">
                  {user?.role || "user"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-primary-foreground/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Ext. {user?.extension}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
