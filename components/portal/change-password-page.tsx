"use client"

import { useState } from "react"
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { ASTERISK_API, apiUrl, BridgePaths } from "@/lib/mock-data"

type PasswordRule = {
  label: string
  test: (pwd: string) => boolean
}

const rules: PasswordRule[] = [
  { label: "At least 8 characters",           test: p => p.length >= 8 },
  { label: "At least one uppercase letter",    test: p => /[A-Z]/.test(p) },
  { label: "At least one number",              test: p => /[0-9]/.test(p) },
  { label: "At least one special character (@#!$%&*)", test: p => /[@#!$%&*]/.test(p) },
]

export function ChangePasswordPage({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState("")
  const [success, setSuccess]                 = useState(false)

  const allRulesPassed = rules.every(r => r.test(newPassword))
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0

  const handleSubmit = async () => {
    setError("")

    if (!currentPassword) {
      setError("Please enter your current password")
      return
    }
    if (!allRulesPassed) {
      setError("New password does not meet complexity requirements")
      return
    }
    if (!passwordsMatch) {
      setError("Passwords do not match")
      return
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        apiUrl(
          ASTERISK_API,
          BridgePaths.users,
          String(user?.id ?? ""),
          "change-password"
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to change password")
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onComplete()
      }, 2000)

    } catch {
      setError("Cannot connect to server. Please try again.")
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Password Changed!</h2>
          <p className="text-sm text-muted-foreground mt-2">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md border border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 mx-auto mb-3">
            <Lock className="h-7 w-7 text-amber-500" />
          </div>
          <CardTitle className="text-xl">Change Your Password</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            You must change your password before continuing
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Current Password */}
          <div className="flex flex-col gap-2">
            <Label>Current Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="flex flex-col gap-2">
            <Label>New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showNew ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Rules */}
            {newPassword.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {rules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {rule.test(newPassword) ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                    <span className={rule.test(newPassword) ? "text-green-600" : "text-muted-foreground"}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <Label>Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p className={`text-xs ${passwordsMatch ? "text-green-600" : "text-destructive"}`}>
                {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !allRulesPassed || !passwordsMatch}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
          >
            {loading ? "Changing Password..." : "Change Password"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Extension: <span className="font-mono font-bold">{user?.extension}</span> · {user?.name}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}