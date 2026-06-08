"use client"

import { useCallback, useRef } from "react"

const SWIPE_THRESHOLD = 56
const LONG_PRESS_MS = 480
const MOVE_CANCEL_PX = 14

type Options = {
  collapsed: boolean
  onToggle: () => void
  onExpand: () => void
  onCollapse: () => void
}

export function useSidebarGestures({
  collapsed,
  onToggle,
  onExpand,
  onCollapse,
}: Options) {
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null)
  const touchOrigin = useRef<{ x: number; y: number } | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const suppressNextClick = useRef(false)

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      pointerOrigin.current = { x: e.clientX, y: e.clientY }
      clearLongPress()
      longPressTimer.current = window.setTimeout(() => {
        longPressTimer.current = null
        suppressNextClick.current = true
        onToggle()
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(12)
        }
      }, LONG_PRESS_MS)
    },
    [clearLongPress, onToggle]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pointerOrigin.current) return
      const dx = e.clientX - pointerOrigin.current.x
      const dy = e.clientY - pointerOrigin.current.y
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearLongPress()
    },
    [clearLongPress]
  )

  const onPointerEnd = useCallback(() => {
    clearLongPress()
    pointerOrigin.current = null
  }, [clearLongPress])

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const t = e.touches[0]
    if (!t) return
    touchOrigin.current = { x: t.clientX, y: t.clientY }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!touchOrigin.current) return
      const t = e.changedTouches[0]
      if (!t) return

      const dx = t.clientX - touchOrigin.current.x
      const dy = t.clientY - touchOrigin.current.y
      touchOrigin.current = null

      if (Math.abs(dy) > Math.abs(dx)) return
      if (Math.abs(dx) < SWIPE_THRESHOLD) return

      if (collapsed && dx > 0) onExpand()
      if (!collapsed && dx < 0) onCollapse()
    },
    [collapsed, onCollapse, onExpand]
  )

  const guardNavClick = useCallback((action: () => void) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      return
    }
    action()
  }, [])

  const hint = collapsed
    ? "Press and hold or swipe right to expand menu"
    : "Press and hold or swipe left to collapse menu"

  return {
    asideProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerLeave: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onTouchStart,
      onTouchEnd,
      "aria-label": hint,
      title: hint,
    },
    guardNavClick,
  }
}
