"use client"

import { useEffect, useRef } from "react"

/** Idle time before automatic logout (30 minutes). */
export const SESSION_IDLE_MS = 30 * 60 * 1000

/**
 * Logs the user out after a period without mouse/keyboard/scroll activity.
 */
export function useSessionTimeout(
  onTimeout: () => void,
  enabled: boolean,
  idleMs: number = SESSION_IDLE_MS
) {
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (!enabled) return

    let timer = 0

    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => onTimeoutRef.current(), idleMs)
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const
    for (const name of events) {
      window.addEventListener(name, reset, { passive: true })
    }
    reset()

    return () => {
      window.clearTimeout(timer)
      for (const name of events) {
        window.removeEventListener(name, reset)
      }
    }
  }, [enabled, idleMs])
}
