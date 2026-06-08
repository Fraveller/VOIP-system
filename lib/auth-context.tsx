"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { readJsonResponse } from "./api-client"
import { getSecuritySettings } from "./security-settings"
import { ASTERISK_API, apiUrl, BridgePaths } from "./mock-data"

export type UserRole = "admin" | "user"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  extension: string
  mustChangePassword?: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  failedAttempts: number
  isLocked: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function isDemoAdmin(email: string, password: string) {
  return (
    email.trim().toLowerCase() === "admin@udsm.ac.tz" && password === "admin123"
  )
}

function userFromRecord(u: Record<string, unknown>): User {
  return {
    id: String(u.id ?? ""),
    name: String(u.name ?? ""),
    email: String(u.email ?? ""),
    role: (u.role as UserRole) ?? "user",
    department: String(u.department ?? ""),
    extension: String(u.extension ?? ""),
    mustChangePassword: Boolean(u.mustChangePassword),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked]           = useState(false)

  const login = async (email: string, password: string): Promise<boolean> => {
    if (isLocked) return false

    const tryDemoAdmin = (): boolean => {
      if (!isDemoAdmin(email, password)) return false
      setUser({
        id: "1",
        name: "Dr. Amina Mwangi",
        email: "admin@udsm.ac.tz",
        role: "admin",
        department: "Computing Centre (UCC)",
        extension: "1001",
      })
      setFailedAttempts(0)
      return true
    }

    try {
      const res = await fetch(apiUrl(ASTERISK_API, BridgePaths.login), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const { object: data } = await readJsonResponse(res)

      if (res.ok && data?.user && typeof data.user === "object" && data.user !== null) {
        setUser(userFromRecord(data.user as Record<string, unknown>))
        setFailedAttempts(0)
        return true
      }

      if (tryDemoAdmin()) return true

      const sec = getSecuritySettings()
      setFailedAttempts((prev) => {
        const next = prev + 1
        if (next >= sec.maxFailedLoginAttempts) {
          setIsLocked(true)
          setTimeout(() => {
            setIsLocked(false)
            setFailedAttempts(0)
          }, sec.lockoutDurationSec * 1000)
        }
        return next
      })
      return false
    } catch {
      if (tryDemoAdmin()) return true

      const sec = getSecuritySettings()
      setFailedAttempts((prev) => {
        const next = prev + 1
        if (next >= sec.maxFailedLoginAttempts) {
          setIsLocked(true)
          setTimeout(() => {
            setIsLocked(false)
            setFailedAttempts(0)
          }, sec.lockoutDurationSec * 1000)
        }
        return next
      })
      return false
    }
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      failedAttempts,
      isLocked,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}