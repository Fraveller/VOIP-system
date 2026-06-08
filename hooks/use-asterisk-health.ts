"use client"

import { useCallback, useEffect, useState } from "react"
import {
  checkAsteriskApiHealth,
  type AsteriskHealthResult,
} from "@/lib/asterisk-health"

export type AsteriskHealthUiStatus =
  | { kind: "checking" }
  | AsteriskHealthResult

export function useAsteriskHealth(pollIntervalMs: number | false = false) {
  const [status, setStatus] = useState<AsteriskHealthUiStatus>({ kind: "checking" })

  const refresh = useCallback(async () => {
    setStatus({ kind: "checking" })
    const next = await checkAsteriskApiHealth()
    setStatus(next)
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const next = await checkAsteriskApiHealth()
      if (!cancelled) setStatus(next)
    })()

    if (pollIntervalMs === false) {
      return () => {
        cancelled = true
      }
    }

    const id = window.setInterval(() => {
      void (async () => {
        const next = await checkAsteriskApiHealth()
        if (!cancelled) setStatus(next)
      })()
    }, pollIntervalMs)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pollIntervalMs])

  return { status, refresh }
}
