/**
 * Open the system/default SIP handler (installed softphone) to place a call.
 */
export function dialExtension(extension: string, sipHost?: string | null) {
  const ext = String(extension ?? "").trim()
  if (!ext) return

  const host = (sipHost ?? "").trim() || "localhost"
  const uri = `sip:${ext}@${host}`

  const link = document.createElement("a")
  link.href = uri
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
