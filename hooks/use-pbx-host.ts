"use client"

import { useCallback, useEffect, useState } from "react"
import type { PbxConnectionInfo } from "@/lib/pbx-host"

/**
 * Live PBX host/API from serverside `.env.local` via `/api/portal/pbx-host`.
 * Use this in the UI instead of bundled `ASTERISK_DIRECT_API` so the endpoint
 * label matches the proxy target after env changes + dev restart.
 */
export function usePbxHost() {
  const [info, setInfo] = useState<PbxConnectionInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/pbx-host", { cache: "no-store" })
      if (!res.ok) {
        setError(`HTTP ${res.status}`)
        return null
      }
      const data = (await res.json()) as PbxConnectionInfo
      setInfo(data)
      setError(null)
      return data
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load PBX config"
      setError(msg)
      return null
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    info,
    displayTarget: info?.displayTarget ?? "…",
    configuredApi: info?.configuredApi,
    configSource: info?.configSource,
    sipHost: info?.sipHost,
    sipPort: info?.sipPort,
    error,
    reload,
  }
}
