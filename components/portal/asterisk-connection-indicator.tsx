"use client"

import { RefreshCw, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAsteriskHealth } from "@/hooks/use-asterisk-health"
import { usePbxHost } from "@/hooks/use-pbx-host"
import { cn } from "@/lib/utils"

type Props = {
  variant?: "compact" | "banner"
  pollIntervalMs?: number | false
  className?: string
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString()
  } catch {
    return "—"
  }
}

export function AsteriskConnectionIndicator({
  variant = "compact",
  pollIntervalMs = false,
  className,
}: Props) {
  const { status, refresh } = useAsteriskHealth(pollIntervalMs)
  const { displayTarget: target, configSource, reload: reloadPbxHost } = usePbxHost()

  const dotClass =
    status.kind === "checking"
      ? "bg-amber-400 animate-pulse"
      : status.kind === "online"
        ? "bg-green-400"
        : status.kind === "degraded"
          ? "bg-amber-400"
          : "bg-red-400"

  const shortLabel =
    status.kind === "checking"
      ? "Checking…"
      : status.kind === "online"
        ? "PBX ONLINE"
        : status.kind === "degraded"
          ? `PBX ISSUE (${status.httpStatus})`
          : "PBX OFFLINE"

  const detailLines =
    status.kind === "checking"
      ? [`Endpoint: ${target}`, "Running health check…"]
      : status.kind === "online"
        ? [
            `Endpoint: ${target}`,
            `Latency: ${status.latencyMs} ms`,
            `Checked: ${formatTime(status.checkedAt)}`,
          ]
        : status.kind === "degraded"
          ? [
              `Endpoint: ${target}`,
              `HTTP ${status.httpStatus} (${status.latencyMs} ms)`,
              `Checked: ${formatTime(status.checkedAt)}`,
            ]
          : [
              `Endpoint: ${target}`,
              status.reason,
              `Checked: ${formatTime(status.checkedAt)}`,
            ]

  if (variant === "compact") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              void reloadPbxHost()
              void refresh()
            }}
            className={cn(
              "flex items-center gap-2 rounded-md border border-primary-foreground/25 bg-primary-foreground/10 px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-foreground/15 transition-colors",
              className
            )}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={cn("inline-flex h-2 w-2 rounded-full", dotClass)}
              />
            </span>
            <Server className="h-3.5 w-3.5 opacity-90 shrink-0" />
            <span className="inline max-w-[9rem] truncate">
              {shortLabel}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <p className="font-semibold mb-1">Asterisk bridge</p>
          <ul className="space-y-0.5 text-muted-foreground">
            {detailLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {configSource && (
            <p className="mt-2 text-[10px] text-muted-foreground/80">
              Config: {configSource}
            </p>
          )}
          <p className="mt-1 text-muted-foreground">Click to refresh.</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-[13px]",
        status.kind === "online"
          ? "border-green-200 bg-green-50 text-green-900"
          : status.kind === "degraded"
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : status.kind === "checking"
              ? "border-[#e2e6ed] bg-[#f8f9fb] text-[#5c6370]"
              : "border-red-200 bg-red-50 text-red-900",
        className
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span className="relative flex h-2.5 w-2.5 mt-1.5 shrink-0">
          <span className={cn("inline-flex h-2.5 w-2.5 rounded-full", dotClass)} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[#1a1d23] flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 shrink-0 opacity-70" />
            Asterisk connection
          </p>
          <p className="text-[12px] text-[#5c6370] mt-0.5 break-words">
            {status.kind === "checking" && "Checking reachability of your PBX API bridge…"}
            {status.kind === "online" &&
              `Connected — ${status.latencyMs} ms to ${target}`}
            {status.kind === "degraded" &&
              `Reachable but returned HTTP ${status.httpStatus} (${status.latencyMs} ms).`}
            {status.kind === "offline" &&
              `Cannot reach API at ${target}: ${status.reason}`}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 h-8 border-[#e2e6ed] bg-white text-[#1a1d23] hover:bg-[#f8f9fb]"
        onClick={() => {
          void reloadPbxHost()
          void refresh()
        }}
        disabled={status.kind === "checking"}
        aria-label="Refresh Asterisk connection check"
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", status.kind === "checking" && "animate-spin")}
        />
      </Button>
    </div>
  )
}
