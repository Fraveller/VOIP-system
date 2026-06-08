"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Save, Bell, Shield, Phone, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { ASTERISK_API, apiUrl, BridgePaths } from "@/lib/mock-data"
import { usePbxHost } from "@/hooks/use-pbx-host"
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
} from "@/lib/user-preferences"

type PasswordRule = {
  label: string
  test: (pwd: string) => boolean
}

const rules: PasswordRule[] = [
  { label: "At least 8 characters",                    test: p => p.length >= 8 },
  { label: "At least one uppercase letter",             test: p => /[A-Z]/.test(p) },
  { label: "At least one number",                       test: p => /[0-9]/.test(p) },
  { label: "At least one special character (@#!$%&*)",  test: p => /[@#!$%&*]/.test(p) },
]

export function SettingsPage() {
  const { user } = useAuth()
  const { sipHost, sipPort } = usePbxHost()

  // ─── Notification state ───────────────────────────────────────────────────
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [callAlerts, setCallAlerts]                 = useState(true)
  const [securityAlerts, setSecurityAlerts]         = useState(true)
  const [prefsSaving, setPrefsSaving]               = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const prefs = loadNotificationPrefs(user.id)
    setEmailNotifications(prefs.emailNotifications)
    setCallAlerts(prefs.callAlerts)
    setSecurityAlerts(prefs.securityAlerts)
  }, [user?.id])

  const handleSavePreferences = () => {
    if (!user?.id) return
    setPrefsSaving(true)
    saveNotificationPrefs(user.id, {
      emailNotifications,
      callAlerts,
      securityAlerts,
    })
    setPrefsSaving(false)
    toast.success("Preferences saved", {
      description: "Your notification settings have been updated.",
    })
  }

  // ─── Password change state ────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [pwdLoading, setPwdLoading]           = useState(false)
  const [pwdError, setPwdError]               = useState("")
  const [pwdSuccess, setPwdSuccess]           = useState("")

  const allRulesPassed = rules.every(r => r.test(newPassword))
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0

  // ─── Change Password ──────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwdError("")
    setPwdSuccess("")

    if (!currentPassword) { setPwdError("Enter your current password"); return }
    if (!allRulesPassed)  { setPwdError("New password does not meet requirements"); return }
    if (!passwordsMatch)  { setPwdError("Passwords do not match"); return }
    if (currentPassword === newPassword) { setPwdError("New password must be different"); return }

    setPwdLoading(true)
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
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      )

      const data = await res.json()
      if (!res.ok) {
        setPwdError(data.error || "Failed to change password")
      } else {
        setPwdSuccess("✅ Password changed successfully! Your SIP softphone password has also been updated.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      setPwdError("Cannot connect to server. Please try again.")
    }
    setPwdLoading(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your portal and call preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Full Name</Label>
              <Input defaultValue={user?.name || ""} disabled className="bg-muted" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Email</Label>
              <Input defaultValue={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Department</Label>
              <Input defaultValue={user?.department || ""} disabled className="bg-muted" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Extension</Label>
              <Input defaultValue={user?.extension || ""} disabled className="bg-muted font-mono font-bold" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Role</Label>
              <Input defaultValue={user?.role || ""} disabled className="bg-muted capitalize" />
            </div>
            <p className="text-xs text-muted-foreground">
              Contact your administrator to update profile information.
            </p>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive email alerts for important events</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Missed Call Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified for missed calls</p>
              </div>
              <Switch checked={callAlerts} onCheckedChange={setCallAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Security Alerts</p>
                <p className="text-xs text-muted-foreground">Alerts for suspicious login activity</p>
              </div>
              <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
            </div>
            <Button
              type="button"
              className="w-fit bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={prefsSaving || !user?.id}
              onClick={handleSavePreferences}
            >
              <Save className="mr-2 h-4 w-4" />
              {prefsSaving ? "Saving…" : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>

        {/* Call Settings */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Phone className="h-4 w-4 text-primary" />
              Call Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Ring Timeout (seconds)</Label>
              <Select defaultValue="30">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="45">45 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/*<div className="flex flex-col gap-2">
              <Label className="text-sm">Call Forwarding Number</Label>
              <Input placeholder="Enter forwarding number" />
            </div>*/}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Voicemail</p>
                <p className="text-xs text-muted-foreground">Enable voicemail when unavailable</p>
              </div>
              <Switch defaultChecked />
            </div>

            {/* SIP Credentials Info */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-semibold text-primary mb-2">Your SIP Credentials</p>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Server:</span>
                  <span className="font-mono">{sipHost ?? "—"}:{sipPort ?? "5060"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Username:</span>
                  <span className="font-mono font-bold">{user?.extension}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transport:</span>
                  <span className="font-mono">UDP</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Password is same as your portal password
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Shield className="h-4 w-4 text-primary" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">

            {pwdError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {pwdError}
              </div>
            )}
            {pwdSuccess && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-600">
                {pwdSuccess}
              </div>
            )}

            {/* Current Password */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="pr-10"
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
              <Label className="text-sm">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="pr-10"
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
                <div className="flex flex-col gap-1 mt-1">
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
              <Label className="text-sm">Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="pr-10"
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

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-700">
              ⚠️ Changing your password will also update your SIP softphone password. Re-register your softphone after changing.
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={pwdLoading || !allRulesPassed || !passwordsMatch || !currentPassword}
              className="w-fit bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Shield className="mr-2 h-4 w-4" />
              {pwdLoading ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}