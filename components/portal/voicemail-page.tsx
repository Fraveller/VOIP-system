"use client"

import { useState, useEffect } from "react"
import { Play, Pause, Download, Trash2, Voicemail, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ASTERISK_API, apiUrl, BridgePaths } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

type VoicemailItem = {
  id: string
  callerName: string
  caller: string
  date: string
  duration: string
  read: boolean
  file?: string
}

export function VoicemailPage() {
  const { user } = useAuth()
  const [voicemails, setVoicemails] = useState<VoicemailItem[]>([])
  const [playing, setPlaying]       = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [lastRefresh, setLastRefresh] = useState("—")

  const fetchVoicemails = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        apiUrl(
          ASTERISK_API,
          BridgePaths.voicemail,
          String(user?.extension ?? "")
        )
      )
      const data = await res.json()
      if (Array.isArray(data)) setVoicemails(data)
    } catch {
      // No voicemails or server error
      setVoicemails([])
    }
    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }

  useEffect(() => {
    void fetchVoicemails()
  }, [])

  const markAsRead = (id: string) => {
    setVoicemails(prev => prev.map(v => v.id === id ? { ...v, read: true } : v))
  }

  const deleteVoicemail = (id: string) => {
    setVoicemails(prev => prev.filter(v => v.id !== id))
  }

  const unread = voicemails.filter(v => !v.read).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Voicemail</h2>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread messages` : "No unread messages"} · Extension {user?.extension} · {lastRefresh}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchVoicemails}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading voicemails...
        </div>
      ) : voicemails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Voicemail className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No voicemails</p>
            <p className="text-xs text-muted-foreground mt-1">
              Voicemails left for extension {user?.extension} will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {voicemails.map((vm) => (
            <Card
              key={vm.id}
              className={cn(
                "border transition-colors",
                vm.read ? "border-border" : "border-secondary bg-secondary/5"
              )}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    vm.read ? "bg-muted" : "bg-secondary/10"
                  )}>
                    <Voicemail className={cn("h-5 w-5", vm.read ? "text-muted-foreground" : "text-secondary")} />
                  </div>
                  <div>
                    <p className={cn("text-sm text-foreground", !vm.read && "font-semibold")}>
                      {vm.callerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vm.caller} · {vm.date} · {vm.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setPlaying(playing === vm.id ? null : vm.id)
                      markAsRead(vm.id)
                    }}
                  >
                    {playing === vm.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteVoicemail(vm.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}