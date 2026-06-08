"use client"

import { useEffect, useState } from "react"
import { Download, FileText, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { ASTERISK_API } from "@/lib/mock-data"
import { toast } from "sonner"
import * as XLSX from "xlsx"

// ─── Excel styling helpers ────────────────────────────────────────────────────
const NAVY   = "1B3A6B"
const BLUE   = "2E5FAC"
const GREEN  = "10B981"
const RED    = "EF4444"
const AMBER  = "F59E0B"
const WHITE  = "FFFFFF"
const LGRAY  = "F8FAFC"
const LBLUE  = "EBF2FF"
const DGRAY  = "64748B"

function hCell(value: string, bg = NAVY, fg = WHITE, bold = true, sz = 11): any {
  return {
    v: value, t: "s",
    s: {
      font:      { name: "Arial", sz, bold, color: { rgb: fg } },
      fill:      { fgColor: { rgb: bg } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border:    { top: b(), bottom: b(), left: b(), right: b() },
    }
  }
}

function dCell(value: any, bg = WHITE, bold = false, color = "1E293B", align = "left"): any {
  return {
    v: value ?? "", t: typeof value === "number" ? "n" : "s",
    s: {
      font:      { name: "Arial", sz: 10, bold, color: { rgb: color } },
      fill:      { fgColor: { rgb: bg } },
      alignment: { horizontal: align, vertical: "center" },
      border:    { top: b(), bottom: b(), left: b(), right: b() },
    }
  }
}

function b() { return { style: "thin", color: { rgb: "CBD5E1" } } }

function statusCell(value: string): any {
  const color = ["ACTIVE","ENABLED","VALID","OPEN","ANSWERED","Online"].includes(value)
    ? GREEN : ["BLOCKED","DISABLED","Offline","NO ANSWER","BUSY"].includes(value)
    ? RED : AMBER
  return dCell(value, WHITE, true, color, "center")
}

function emptyRow(): any[] { return [{ v: "", s: { fill: { fgColor: { rgb: WHITE } } } }] }

const DEPT_FILTER_MATCH: Record<string, string> = {
  ucc: "Computing",
  cs: "Computer",
  eng: "Engineering",
}

function filterCdrRecords(
  source: any[],
  users: any[],
  startDate: string,
  endDate: string,
  deptFilter: string
): any[] {
  let filtered = [...source]
  if (startDate) {
    const start = new Date(startDate).getTime()
    filtered = filtered.filter((r) => {
      const d = new Date(String(r.dateTime ?? "").replace(" ", "T")).getTime()
      return !isNaN(d) && d >= start
    })
  }
  if (endDate) {
    const end = new Date(endDate).getTime() + 86400000
    filtered = filtered.filter((r) => {
      const d = new Date(String(r.dateTime ?? "").replace(" ", "T")).getTime()
      return !isNaN(d) && d <= end
    })
  }
  if (deptFilter !== "all") {
    const needle = DEPT_FILTER_MATCH[deptFilter] ?? deptFilter
    filtered = filtered.filter((r) => {
      const callerUser = users.find((u) => String(u.extension) === String(r.caller))
      const calleeUser = users.find((u) => String(u.extension) === String(r.callee))
      return [callerUser, calleeUser].some((u) =>
        String(u?.department ?? "")
          .toLowerCase()
          .includes(needle.toLowerCase())
      )
    })
  }
  return filtered
}

export function ReportsPage() {
  const [activeCalls, setActiveCalls]         = useState(0)
  const [totalExt, setTotalExt]               = useState(0)
  const [registeredExt, setRegisteredExt]     = useState(0)
  const [lastRefresh, setLastRefresh]         = useState("—")
  const [cdrRecords, setCdrRecords]           = useState<any[]>([])
  const [users, setUsers]                     = useState<any[]>([])
  const [deptFilter, setDeptFilter]           = useState("all")
  const [startDate, setStartDate]             = useState("")
  const [endDate, setEndDate]                 = useState("")
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])

  const fetchStats = async () => {
    try {
      const epRes = await fetch(`${ASTERISK_API}/endpoints`)
      const endpoints = await epRes.json()
      if (Array.isArray(endpoints)) {
        setTotalExt(endpoints.length)
        setRegisteredExt(endpoints.filter((e: any) => e.state === "online").length)
      }
      const chRes = await fetch(`${ASTERISK_API}/channels`)
      const channels = await chRes.json()
      if (Array.isArray(channels)) setActiveCalls(channels.length)

      const cdrRes = await fetch(`${ASTERISK_API}/realcdr`)
      const cdrData = await cdrRes.json()
      if (Array.isArray(cdrData)) { setCdrRecords(cdrData); setFilteredRecords(cdrData) }

      const usersRes = await fetch(`${ASTERISK_API}/users`)
      const usersData = await usersRes.json()
      if (Array.isArray(usersData)) setUsers(usersData)
    } catch { }
    setLastRefresh(new Date().toLocaleTimeString())
  }

  useEffect(() => {
    void fetchStats()
  }, [])

  const handleGenerate = () => {
    const filtered = filterCdrRecords(
      cdrRecords,
      users,
      startDate,
      endDate,
      deptFilter
    )
    setFilteredRecords(filtered)
    if (filtered.length === 0) {
      toast.warning("No calls in range", {
        description: "Adjust the date range or department filter and try again.",
      })
      return
    }
    exportExcel(filtered)
    toast.success("Excel report downloaded", {
      description: `${filtered.length} call record(s) exported for the selected filters.`,
    })
  }

  const records =
    filteredRecords.length > 0 || startDate || endDate || deptFilter !== "all"
      ? filteredRecords
      : cdrRecords
  const internal = records.filter(r => r.type === "Internal").length
  const inbound  = records.filter(r => r.type === "Inbound").length
  const outbound = records.filter(r => r.type === "Outbound").length
  const missed   = records.filter(r => r.type === "Missed").length
  const answered = records.filter(r => r.type !== "Missed").length
  const total    = records.length || 1

  const avgDuration = (() => {
    const durations = records.map(r => {
      const parts = String(r.duration).split(":")
      if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1])
      return parseInt(r.duration) || 0
    }).filter(d => d > 0)
    if (!durations.length) return "0:00"
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    return `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, "0")}`
  })()

  const hourMap: Record<number, number> = {}
  records.forEach(r => { const h = new Date(r.dateTime).getHours(); if (!isNaN(h)) hourMap[h] = (hourMap[h] || 0) + 1 })
  const peakHour    = Object.entries(hourMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
  const peakHourStr = peakHour ? `${peakHour[0]}:00 - ${parseInt(peakHour[0]) + 1}:00` : "N/A"

  const callerMap: Record<string, number> = {}
  records.forEach(r => { if (r.caller) callerMap[r.caller] = (callerMap[r.caller] || 0) + 1 })
  const topExt      = Object.entries(callerMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
  const topUser     = topExt ? (users.find(u => u.extension === topExt[0])?.name ?? `Ext ${topExt[0]}`) : "N/A"
  const topCalls    = topExt ? topExt[1] : 0

  const weeklyData = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => ({
    day, calls: records.filter(r => new Date(r.dateTime).getDay() === ((i + 1) % 7)).length
  }))

  const callerMap2: Record<string, number> = {}
  records.forEach(r => { const n = r.callerName ?? r.caller ?? "Unknown"; callerMap2[n] = (callerMap2[n] || 0) + 1 })
  const callsPerUser = Object.entries(callerMap2).map(([name, calls]) => ({ name, calls })).sort((a, b) => b.calls - a.calls).slice(0, 10)

  const ansRate  = Math.round((answered / total) * 100)
  const missRate = Math.round((missed   / total) * 100)
  const regRate  = totalExt > 0 ? Math.round((registeredExt / totalExt) * 100) : 0
  const now      = new Date()
  const reportDate = now.toISOString().slice(0, 10)
  const reportTime = now.toLocaleTimeString()
  const footerNote = `Generated: ${reportDate} ${reportTime} | UDSM Secure VoIP Portal | CONFIDENTIAL`

  // ─── Export Excel (filtered call records) ─────────────────────────────────
  const exportExcel = (exportRecords: any[] = records) => {
    const wb = XLSX.utils.book_new()
    const rows = exportRecords
    const xInternal = rows.filter((r) => r.type === "Internal").length
    const xInbound = rows.filter((r) => r.type === "Inbound").length
    const xOutbound = rows.filter((r) => r.type === "Outbound").length
    const xMissed = rows.filter((r) => r.type === "Missed").length
    const xAnswered = rows.filter((r) => r.type !== "Missed").length
    const xTotal = rows.length || 1
    const xAnsRate = Math.round((xAnswered / xTotal) * 100)
    const xMissRate = Math.round((xMissed / xTotal) * 100)
    const rangeLabel =
      startDate || endDate
        ? `${startDate || "…"} → ${endDate || "…"}`
        : "All dates"
    const fileSuffix =
      startDate && endDate
        ? `${startDate}_to_${endDate}`
        : reportDate

    // ── SHEET 1: COVER PAGE ────────────────────────────────────────────────
    const cover: any[][] = [
      [hCell("UNIVERSITY OF DAR ES SALAAM", NAVY, WHITE, true, 18)],
      [hCell("Computing Centre (UCC)", NAVY, "93C5FD", false, 13)],
      [hCell("SECURE VoIP SYSTEM — ANALYTICS REPORT", NAVY, "FCD34D", true, 16)],
      [hCell("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", AMBER, AMBER, false, 6)],
      emptyRow(),
      [hCell("REPORT INFORMATION", BLUE, WHITE, true, 12)],
      [dCell("Report Title",    LBLUE, true, NAVY), dCell("UDSM Secure VoIP System — Analytics Report", LBLUE)],
      [dCell("Organization",    WHITE, true, NAVY), dCell("University of Dar es Salaam", WHITE)],
      [dCell("Department",      LBLUE, true, NAVY), dCell("Computing Centre (UCC)", LBLUE)],
      [dCell("Report Date",     LBLUE, true, NAVY), dCell(reportDate, LBLUE)],
      [dCell("Filter Range",    WHITE, true, NAVY), dCell(rangeLabel, WHITE)],
      [dCell("Calls Exported",  LBLUE, true, NAVY), dCell(rows.length, LBLUE, true, NAVY, "center")],
      [dCell("Report Time",     WHITE, true, NAVY), dCell(reportTime, WHITE)],
      [dCell("Prepared By",     LBLUE, true, NAVY), dCell("UDSM VoIP Portal — Automated", LBLUE)],
      [dCell("Classification",  WHITE, true, RED),  dCell("INTERNAL USE ONLY", WHITE, true, RED)],
      emptyRow(),
      [hCell("TABLE OF CONTENTS", BLUE, WHITE, true, 12)],
      [dCell("Sheet 2", LBLUE, true, NAVY, "center"), dCell("System Overview",     LBLUE, true), dCell("Extensions, users, registration status", LBLUE)],
      [dCell("Sheet 3", WHITE, true, NAVY, "center"), dCell("Call Statistics",     WHITE, true), dCell("Call volumes, answer rates, peak hours", WHITE)],
      [dCell("Sheet 4", LBLUE, true, NAVY, "center"), dCell("Call Detail Records", LBLUE, true), dCell("Full CDR log with all call details", LBLUE)],
      [dCell("Sheet 5", WHITE, true, NAVY, "center"), dCell("Security Report",     WHITE, true), dCell("TLS, SRTP, firewall, password policies", WHITE)],
      emptyRow(),
      [dCell(footerNote, LGRAY, false, DGRAY, "center")],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(cover)
    ws1["!cols"] = [{ wch: 30 }, { wch: 55 }, { wch: 45 }]
    ws1["!merges"] = [
      { s:{r:0,c:0}, e:{r:0,c:2} }, { s:{r:1,c:0}, e:{r:1,c:2} },
      { s:{r:2,c:0}, e:{r:2,c:2} }, { s:{r:3,c:0}, e:{r:3,c:2} },
      { s:{r:5,c:0}, e:{r:5,c:2} }, { s:{r:15,c:0}, e:{r:15,c:2} },
      { s:{r:20,c:0}, e:{r:20,c:2} },
    ]
    XLSX.utils.book_append_sheet(wb, ws1, "Cover Page")

    // ── SHEET 2: SYSTEM OVERVIEW ───────────────────────────────────────────
    const sysData: any[][] = [
      [hCell("SYSTEM OVERVIEW REPORT", NAVY, WHITE, true, 14), {v:""}, {v:""}],
      emptyRow(),
      [hCell("EXTENSION & REGISTRATION STATUS", BLUE, WHITE, true, 11), {v:""}, {v:""}],
      [hCell("Metric",NAVY),        hCell("Value",NAVY),  hCell("Status",NAVY), hCell("Notes",NAVY)],
      [dCell("Total Extensions Configured",LBLUE),  dCell(totalExt,LBLUE,true,NAVY,"center"),      statusCell("Info"),    dCell("All extensions on Asterisk PBX",LBLUE)],
      [dCell("Registered Extensions",WHITE),         dCell(registeredExt,WHITE,true,GREEN,"center"), statusCell("Online"),  dCell("Softphones actively connected",WHITE)],
      [dCell("Unregistered Extensions",LBLUE),       dCell(totalExt-registeredExt,LBLUE,true,RED,"center"), statusCell("Offline"), dCell("No softphone connected",LBLUE)],
      [dCell("Registration Rate",WHITE),             dCell(`${regRate}%`,WHITE,true,NAVY,"center"), statusCell(regRate>=80?"ACTIVE":"AMBER"), dCell("Target: >80%",WHITE)],
      [dCell("Active Calls Right Now",LBLUE),        dCell(activeCalls,LBLUE,true,NAVY,"center"),   statusCell("ACTIVE"),  dCell("Real-time from Asterisk",LBLUE)],
      emptyRow(),
      [hCell("USER MANAGEMENT SUMMARY", BLUE, WHITE, true, 11), {v:""}, {v:""}],
      [hCell("Category",NAVY), hCell("Count",NAVY), hCell("Percentage",NAVY), hCell("Notes",NAVY)],
      [dCell("Total Portal Users",LBLUE),            dCell(users.length,LBLUE,true,NAVY,"center"),  dCell("100%",LBLUE,false,DGRAY,"center"),     dCell("All registered users",LBLUE)],
      [dCell("Admin Users",WHITE),                   dCell(users.filter(u=>u.role==="admin").length,WHITE,true,NAVY,"center"), dCell(`${users.length?Math.round(users.filter(u=>u.role==="admin").length/users.length*100):0}%`,WHITE,false,DGRAY,"center"), dCell("Full system access",WHITE)],
      [dCell("Regular Users",LBLUE),                 dCell(users.filter(u=>u.role==="user").length,LBLUE,true,NAVY,"center"),  dCell(`${users.length?Math.round(users.filter(u=>u.role==="user").length/users.length*100):0}%`,LBLUE,false,DGRAY,"center"),  dCell("Standard access",LBLUE)],
      [dCell("Active Users",WHITE),                  dCell(users.filter(u=>u.status==="active").length,WHITE,true,GREEN,"center"),    dCell(`${users.length?Math.round(users.filter(u=>u.status==="active").length/users.length*100):0}%`,WHITE,false,DGRAY,"center"),    dCell("Account not suspended",WHITE)],
      [dCell("Suspended Users",LBLUE),               dCell(users.filter(u=>u.status==="suspended").length,LBLUE,true,RED,"center"),   dCell(`${users.length?Math.round(users.filter(u=>u.status==="suspended").length/users.length*100):0}%`,LBLUE,false,DGRAY,"center"),   dCell("Access revoked",LBLUE)],
      emptyRow(),
      [dCell(footerNote, LGRAY, false, DGRAY, "center")],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(sysData)
    ws2["!cols"] = [{ wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 30 }]
    ws2["!merges"] = [
      {s:{r:0,c:0},e:{r:0,c:3}}, {s:{r:2,c:0},e:{r:2,c:3}},
      {s:{r:10,c:0},e:{r:10,c:3}}, {s:{r:18,c:0},e:{r:18,c:3}},
    ]
    XLSX.utils.book_append_sheet(wb, ws2, "System Overview")

    // ── SHEET 3: CALL STATISTICS ───────────────────────────────────────────
    const callData: any[][] = [
      [hCell("CALL STATISTICS & ANALYTICS", NAVY, WHITE, true, 14)],
      emptyRow(),
      [hCell("KEY CALL METRICS", BLUE, WHITE, true, 11)],
      [hCell("Metric",NAVY), hCell("Value",NAVY), hCell("Benchmark",NAVY), hCell("Notes",NAVY)],
      [dCell("Total Call Records",LBLUE),    dCell(rows.length,LBLUE,true,NAVY,"center"),  dCell("—",LBLUE,false,DGRAY,"center"),    dCell("Filtered CDR export",LBLUE)],
      [dCell("Internal Calls",WHITE),        dCell(xInternal,WHITE,true,NAVY,"center"),         dCell("—",WHITE,false,DGRAY,"center"),    dCell("Extension to extension",WHITE)],
      [dCell("Inbound Calls",LBLUE),         dCell(xInbound,LBLUE,true,NAVY,"center"),          dCell("—",LBLUE,false,DGRAY,"center"),    dCell("From outside",LBLUE)],
      [dCell("Outbound Calls",WHITE),        dCell(xOutbound,WHITE,true,NAVY,"center"),         dCell("—",WHITE,false,DGRAY,"center"),    dCell("To outside",WHITE)],
      [dCell("Missed Calls",LBLUE),          dCell(xMissed,LBLUE,true,RED,"center"),            dCell("<10%",LBLUE,false,DGRAY,"center"), dCell("Unanswered",LBLUE)],
      [dCell("Answered Calls",WHITE),        dCell(xAnswered,WHITE,true,GREEN,"center"),        dCell(">90%",WHITE,false,DGRAY,"center"), dCell("Successfully connected",WHITE)],
      [dCell("Answer Rate",LBLUE),           dCell(`${xAnsRate}%`,LBLUE,true,xAnsRate>=90?GREEN:RED,"center"), dCell(">90%",LBLUE,false,DGRAY,"center"), dCell("KPI Target",LBLUE)],
      [dCell("Miss Rate",WHITE),             dCell(`${xMissRate}%`,WHITE,true,xMissRate<=10?GREEN:RED,"center"), dCell("<10%",WHITE,false,DGRAY,"center"), dCell("KPI Target",WHITE)],
      [dCell("Average Call Duration",LBLUE), dCell(avgDuration,LBLUE,true,NAVY,"center"),      dCell(">1:00",LBLUE,false,DGRAY,"center"),dCell("mm:ss",LBLUE)],
      [dCell("Peak Hour",WHITE),             dCell(peakHourStr,WHITE,true,NAVY,"center"),      dCell("—",WHITE,false,DGRAY,"center"),    dCell("Busiest time of day",WHITE)],
      [dCell("Most Active User",LBLUE),      dCell(topUser,LBLUE,true,NAVY,"center"),          dCell("—",LBLUE,false,DGRAY,"center"),    dCell(`${topCalls} calls made`,LBLUE)],
      emptyRow(),
      [hCell("WEEKLY CALL VOLUME", BLUE, WHITE, true, 11)],
      [hCell("Day",NAVY), hCell("Total Calls",NAVY), hCell("% of Week",NAVY), hCell("Notes",NAVY)],
      ...["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => {
        const dayCalls = rows.filter((r) => new Date(r.dateTime).getDay() === ((i + 1) % 7)).length
        return [
        dCell(day, i%2===0?LBLUE:WHITE),
        dCell(dayCalls, i%2===0?LBLUE:WHITE, true, NAVY, "center"),
        dCell(rows.length ? `${Math.round(dayCalls/rows.length*100)}%` : "0%", i%2===0?LBLUE:WHITE, false, DGRAY, "center"),
        dCell("—", i%2===0?LBLUE:WHITE, false, DGRAY, "center"),
      ]}),
      emptyRow(),
      [hCell("TOP USERS BY CALL VOLUME", BLUE, WHITE, true, 11)],
      [hCell("User",NAVY), hCell("Total Calls",NAVY), hCell("% of Total",NAVY), hCell("Rank",NAVY)],
      ...(Object.entries(
        rows.reduce<Record<string, number>>((acc, r) => {
          const n = r.callerName ?? r.caller ?? "Unknown"
          acc[n] = (acc[n] || 0) + 1
          return acc
        }, {})
      )
        .map(([name, calls]) => ({ name, calls }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 10)
        .map((u, i) => [
        dCell(u.name, i%2===0?LBLUE:WHITE),
        dCell(u.calls, i%2===0?LBLUE:WHITE, true, NAVY, "center"),
        dCell(`${Math.round(u.calls/xTotal*100)}%`, i%2===0?LBLUE:WHITE, false, DGRAY, "center"),
        dCell(`#${i+1}`, i%2===0?LBLUE:WHITE, true, NAVY, "center"),
      ])),
      emptyRow(),
      [dCell(footerNote, LGRAY, false, DGRAY, "center")],
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(callData)
    ws3["!cols"] = [{ wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 30 }]
    ws3["!merges"] = [
      {s:{r:0,c:0},e:{r:0,c:3}}, {s:{r:2,c:0},e:{r:2,c:3}},
      {s:{r:16,c:0},e:{r:16,c:3}},
    ]
    XLSX.utils.book_append_sheet(wb, ws3, "Call Statistics")

    // ── SHEET 4: CDR LOG ───────────────────────────────────────────────────
    const cdrHeaders = ["Date/Time","Caller Ext.","Caller Name","Callee Ext.","Callee Name","Duration","Type","Status","Network"]
    const cdrRows: any[][] = [
      [hCell("CALL DETAIL RECORDS (CDR) LOG", NAVY, WHITE, true, 14)],
      emptyRow(),
      [hCell("COMPLETE CALL LOG", BLUE, WHITE, true, 11)],
      cdrHeaders.map(h => hCell(h, NAVY)),
      ...rows.map((r, i) => {
        const bg = i%2===0 ? LBLUE : WHITE
        return [
          dCell(r.dateTime,    bg, false, "1E293B", "left"),
          dCell(r.caller,      bg, true,  NAVY,     "center"),
          dCell(r.callerName,  bg),
          dCell(r.callee,      bg, true,  NAVY,     "center"),
          dCell(r.calleeName,  bg),
          dCell(r.duration,    bg, false, DGRAY,    "center"),
          dCell(r.type,        bg, false, DGRAY,    "center"),
          statusCell(r.status ?? r.type ?? "—"),
          dCell(r.networkOrigin ?? "LAN", bg, false, DGRAY, "center"),
        ]
      }),
      emptyRow(),
      [dCell(footerNote, LGRAY, false, DGRAY, "center")],
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(cdrRows)
    ws4["!cols"] = [{wch:20},{wch:12},{wch:20},{wch:12},{wch:20},{wch:10},{wch:12},{wch:12},{wch:10}]
    ws4["!merges"] = [
      {s:{r:0,c:0},e:{r:0,c:8}}, {s:{r:2,c:0},e:{r:2,c:8}},
    ]
    XLSX.utils.book_append_sheet(wb, ws4, "Call Detail Records")

    // ── SHEET 5: SECURITY REPORT ───────────────────────────────────────────
    const secRows: any[][] = [
      [hCell("SECURITY & COMPLIANCE REPORT", NAVY, WHITE, true, 14)],
      emptyRow(),
      [hCell("ENCRYPTION & NETWORK SECURITY", BLUE, WHITE, true, 11)],
      [hCell("Security Feature",NAVY), hCell("Status",NAVY), hCell("Standard",NAVY), hCell("Notes",NAVY)],
      ...[
        ["TLS Encryption (Port 5061)",    "ACTIVE",  "RFC 5246",    "SIP signaling encrypted"],
        ["SRTP Media Encryption",         "ACTIVE",  "RFC 3711",    "Voice audio encrypted (SDES)"],
        ["TLS Certificate",               "VALID",   "X.509",       "Self-signed, 364 days remaining"],
        ["TLS Version",                   "TLSv1.2", "PCI-DSS",     "Modern TLS only"],
        ["UFW Firewall",                  "ACTIVE",  "Best Practice","Whitelist only"],
        ["SIP Port (5060/UDP)",           "OPEN",    "RFC 3261",    "Standard SIP"],
        ["TLS Port (5061/TCP)",           "OPEN",    "RFC 5246",    "Secure SIP"],
        ["RTP Media Ports (10000-20000)", "OPEN",    "RFC 3550",    "Voice stream"],
        ["All Other Ports",               "BLOCKED", "UFW",         "Default deny"],
      ].map((r, i) => [dCell(r[0],i%2===0?LBLUE:WHITE), statusCell(r[1]), dCell(r[2],i%2===0?LBLUE:WHITE,false,DGRAY,"center"), dCell(r[3],i%2===0?LBLUE:WHITE)]),
      emptyRow(),
      [hCell("AUTHENTICATION & PASSWORD POLICY", BLUE, WHITE, true, 11)],
      [hCell("Policy",NAVY), hCell("Status",NAVY), hCell("Value",NAVY), hCell("Notes",NAVY)],
      ...[
        ["bcrypt Password Hashing",        "ENABLED", "Cost: 10",    "Passwords never stored plain"],
        ["Password Minimum Length",        "ENFORCED","8 chars",     "Portal & SIP"],
        ["Uppercase Letter Required",      "ENFORCED","≥1",          "Complexity rule"],
        ["Number Required",                "ENFORCED","≥1",          "Complexity rule"],
        ["Special Character Required",     "ENFORCED","@#!$%&*",     "Complexity rule"],
        ["Force Change on First Login",    "ENABLED", "mustChangePwd","New user policy"],
        ["Failed Login Lockout",           "ENABLED", "5 attempts",  "30 second lockout"],
        ["SIP Password Sync",              "ENABLED", "Auto",        "Portal=SIP password"],
      ].map((r, i) => [dCell(r[0],i%2===0?LBLUE:WHITE), statusCell(r[1]), dCell(r[2],i%2===0?LBLUE:WHITE,false,NAVY,"center"), dCell(r[3],i%2===0?LBLUE:WHITE)]),
      emptyRow(),
      [hCell("DATABASE & STORAGE", BLUE, WHITE, true, 11)],
      [hCell("Component",NAVY), hCell("Technology",NAVY), hCell("Status",NAVY), hCell("Location",NAVY)],
      ...[
        ["User Storage",        "MySQL 8.0",          "ACTIVE", "udsm_voip.users"],
        ["Audit Logs",          "MySQL 8.0",          "ACTIVE", "udsm_voip.audit_logs"],
        ["SIP Extensions",      "MySQL 8.0",          "ACTIVE", "udsm_voip.sip_users"],
        ["SIP Configuration",   "pjsip.conf (file)",  "ACTIVE", "/etc/asterisk/pjsip.conf"],
        ["Call Records (CDR)",  "CSV File",           "ACTIVE", "/var/log/asterisk/cdr-csv/"],
        ["SSL Certificates",    "File System",        "ACTIVE", "/etc/asterisk/keys/"],
      ].map((r, i) => [dCell(r[0],i%2===0?LBLUE:WHITE), dCell(r[1],i%2===0?LBLUE:WHITE,false,DGRAY,"center"), statusCell(r[2]), dCell(r[3],i%2===0?LBLUE:WHITE,false,DGRAY)]),
      emptyRow(),
      [dCell(footerNote, LGRAY, false, DGRAY, "center")],
    ]
    const ws5 = XLSX.utils.aoa_to_sheet(secRows)
    ws5["!cols"] = [{wch:35},{wch:18},{wch:18},{wch:35}]
    ws5["!merges"] = [
      {s:{r:0,c:0},e:{r:0,c:3}}, {s:{r:2,c:0},e:{r:2,c:3}},
    ]
    XLSX.utils.book_append_sheet(wb, ws5, "Security Report")

    // ── Write file ─────────────────────────────────────────────────────────
    XLSX.writeFile(wb, `UDSM-VoIP-Calls-${fileSuffix}.xlsx`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Analytics and call reporting · Last updated: {lastRefresh}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => exportExcel(records)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="mr-2 h-4 w-4" />
            Export Excel Report
          </Button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Extensions</p>
            <p className="text-3xl font-bold text-foreground mt-1">{totalExt}</p>
            <p className="text-xs text-muted-foreground mt-1">On Asterisk PBX</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Registered</p>
            <p className="text-3xl font-bold text-green-500 mt-1">{registeredExt}</p>
            <p className="text-xs text-muted-foreground mt-1">Softphone online</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Calls</p>
            <p className="text-3xl font-bold text-primary mt-1">{activeCalls}</p>
            <p className="text-xs text-muted-foreground mt-1">Right now</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total CDR</p>
            <p className="text-3xl font-bold text-foreground mt-1">{cdrRecords.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Real call records</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Answer Rate</p>
            <p className="text-3xl font-bold text-green-500 mt-1">{ansRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{answered} answered</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Miss Rate</p>
            <p className="text-3xl font-bold text-destructive mt-1">{missRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{missed} missed</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Duration</p>
            <p className="text-3xl font-bold text-foreground mt-1">{avgDuration}</p>
            <p className="text-xs text-muted-foreground mt-1">mm:ss per call</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Peak Hour</p>
            <p className="text-lg font-bold text-foreground mt-1">{peakHourStr}</p>
            <p className="text-xs text-muted-foreground mt-1">Busiest time</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Filters */}
      {/*<Card className="border border-border">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Department</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="ucc">Computing Centre</SelectItem>
                <SelectItem value="cs">Computer Science</SelectItem>
                <SelectItem value="eng">Engineering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleGenerate}>
            <FileText className="mr-2 h-4 w-4" />
            Generate
          </Button>
        </CardContent>
      </Card>*/}

      {cdrRecords.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No CDR records yet. Charts will populate automatically once calls are made.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Weekly Call Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--card-foreground)" }} />
                  <Bar dataKey="calls" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border border-border lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top Users by Call Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {callsPerUser.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={callsPerUser} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--card-foreground)" }} />
                    <Bar dataKey="calls" fill="var(--secondary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}