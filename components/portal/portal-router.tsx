"use client"

import { useEffect, useState } from "react"
import { TopNavbar } from "./top-navbar"
import { AdminDashboard } from "./admin-dashboard"
import { UserDashboard } from "./user-dashboard"
import { UserManagement } from "./user-management"
import { ExtensionManagement } from "./extension-management"
import { LiveDirectory } from "./live-directory"
import { CallRecords } from "./call-records"
import { MonitoringPage } from "./monitoring-page"
import { ReportsPage } from "./reports-page"
import { SecurityPage } from "./security-page"
import { AuditLogs } from "./audit-logs"
import { SettingsPage } from "./settings-page"
import { VoicemailPage } from "./voicemail-page"
import { NotificationsPage } from "./notifications-page"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useSessionTimeout } from "@/hooks/use-session-timeout"
import {
  normalizeSecuritySettings,
  saveSecuritySettingsLocal,
  SECURITY_SETTINGS_CHANGED,
  sessionIdleMs,
} from "@/lib/security-settings"
import { MyCallsPage } from "./my-calls-page"
import { ChangePasswordPage } from "./change-password-page"

// Simple client-side routing since all pages are in one SPA
import { RouterContext, useRouter } from "./portal-router-context"

export { useRouter } from "./portal-router-context"

export function PortalRouter() {
  const [currentPage, setCurrentPage] = useState("/dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const { user, logout, isAuthenticated } = useAuth()
  const [idleMs, setIdleMs] = useState(() => sessionIdleMs())

  useEffect(() => {
    void fetch("/api/portal/security-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          saveSecuritySettingsLocal(normalizeSecuritySettings(data))
          setIdleMs(sessionIdleMs())
        }
      })
      .catch(() => {})

    const onChange = () => setIdleMs(sessionIdleMs())
    window.addEventListener(SECURITY_SETTINGS_CHANGED, onChange)
    return () => window.removeEventListener(SECURITY_SETTINGS_CHANGED, onChange)
  }, [])

  useSessionTimeout(() => {
    logout()
    const mins = Math.round(idleMs / 60000)
    toast.info("Session ended", {
      description: `You were signed out after ${mins} minutes of inactivity.`,
    })
  }, isAuthenticated, idleMs)

  const navigate = (page: string) => setCurrentPage(page)
  const toggleSidebar = () => setSidebarCollapsed((c) => !c)

  const renderPage = () => {
    // Force password change if required
    if (user?.mustChangePassword) {
      return <ChangePasswordPage onComplete={() => window.location.reload()} />
    }

    if (user?.role === "admin") {
      switch (currentPage) {
        case "/dashboard": return <AdminDashboard />
        case "/dashboard/users": return <UserManagement />
        case "/dashboard/extensions": return <ExtensionManagement />
        case "/dashboard/directory": return <LiveDirectory />
        case "/dashboard/call-records": return <CallRecords />
        case "/dashboard/monitoring": return <MonitoringPage />
        case "/dashboard/reports": return <ReportsPage />
        case "/dashboard/security": return <SecurityPage />
        case "/dashboard/audit-logs": return <AuditLogs />
        case "/dashboard/notifications": return <NotificationsPage />
        case "/dashboard/settings": return <SettingsPage />
        default: return <AdminDashboard />
      }
    } else {
      switch (currentPage) {
        case "/dashboard": return <UserDashboard />
        case "/dashboard/directory": return <LiveDirectory />
        case "/dashboard/my-calls": return <MyCallsPage />
        case "/dashboard/voicemail": return <VoicemailPage />
        case "/dashboard/settings": return <SettingsPage />
        default: return <UserDashboard />
      }
    }
  }

  return (
    <RouterContext.Provider
      value={{ currentPage, navigate, sidebarCollapsed, toggleSidebar, setSidebarCollapsed }}
    >
      <div className="flex min-h-screen flex-col">
        <TopNavbar onNavigate={navigate} />
        <div className="flex flex-1">
          <SidebarNavWrapped />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {renderPage()}
          </main>
        </div>
      </div>
    </RouterContext.Provider>
  )
}

function SidebarNavWrapped() {
  return <SidebarNavClient />
}

import {
  LayoutDashboard,
  Users,
  Phone,
  BookOpen,
  PhoneCall,
  Activity,
  BarChart3,
  ShieldAlert,
  Bell,
  FileText,
  Settings,
  Voicemail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebarGestures } from "@/hooks/use-sidebar-gestures"

const adminLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/extensions", label: "Extensions", icon: Phone },
  { href: "/dashboard/directory", label: "Live Directory", icon: BookOpen },
  { href: "/dashboard/call-records", label: "Call Records", icon: PhoneCall },
  { href: "/dashboard/monitoring", label: "Monitoring", icon: Activity },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/security", label: "Security", icon: ShieldAlert },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

const userLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/directory", label: "Directory", icon: BookOpen },
  { href: "/dashboard/my-calls", label: "My Calls", icon: PhoneCall },
  { href: "/dashboard/voicemail", label: "Voicemail", icon: Voicemail },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

function SidebarNavClient() {
  const { user } = useAuth()
  const { currentPage, navigate, sidebarCollapsed, toggleSidebar, setSidebarCollapsed } =
    useRouter()
  const links = user?.role === "admin" ? adminLinks : userLinks

  const { asideProps, guardNavClick } = useSidebarGestures({
    collapsed: sidebarCollapsed,
    onToggle: toggleSidebar,
    onExpand: () => setSidebarCollapsed(false),
    onCollapse: () => setSidebarCollapsed(true),
  })

  return (
    <aside
      {...asideProps}
      className={cn(
        "relative sticky top-16 flex h-[calc(100vh-4rem)] shrink-0 touch-pan-y flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 select-none",
        sidebarCollapsed ? "w-14 sm:w-16" : "w-60"
      )}
    >
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-1">
          {links.map((link) => {
            const isActive = currentPage === link.href
            const Icon = link.icon
            return (
              <li key={link.href}>
                <button
                  type="button"
                  onClick={() => guardNavClick(() => navigate(link.href))}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                    sidebarCollapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  title={sidebarCollapsed ? `${link.label} · hold sidebar to expand` : link.label}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>{link.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
