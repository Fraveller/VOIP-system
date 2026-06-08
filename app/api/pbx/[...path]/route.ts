import { getAsteriskDirectApi } from "@/lib/env"

function buildUpstreamUrl(pathSegments: string[] = [], req: Request) {
  const base = getAsteriskDirectApi().replace(/\/$/, "")
  const suffix = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : ""
  const upstream = new URL(`${base}${suffix}`)
  const incoming = new URL(req.url)
  if (incoming.search) {
    upstream.search = incoming.search
  }
  return upstream.toString()
}

/**
 * Forward only headers PBX bridges expect. Copying the full browser → Next request can
 * include cookies, `sec-fetch-*`, `referer`, etc. Some Node/Express APIs mishandle those and return 500.
 */
function headersForUpstream(req: Request): Headers {
  const out = new Headers()
  const allow = [
    "content-type",
    "authorization",
    "accept",
    "accept-language",
    "x-api-key",
    "idempotency-key",
  ] as const
  for (const name of allow) {
    const v = req.headers.get(name)
    if (v) out.set(name, v)
  }
  if (!out.has("accept")) {
    out.set("accept", "application/json, */*;q=0.8")
  }
  return out
}

async function proxy(req: Request, pathSegments: string[] = []) {
  const upstreamUrl = buildUpstreamUrl(pathSegments, req)
  const headers = headersForUpstream(req)

  const res = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    cache: "no-store",
    duplex: "half",
  } as RequestInit & { duplex: "half" })

  const responseHeaders = new Headers(res.headers)
  responseHeaders.set("cache-control", "no-store")
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  })
}

type RouteContext = {
  params: Promise<{ path?: string[] }>
}

export async function GET(req: Request, ctx: RouteContext) {
  const params = await ctx.params
  return proxy(req, params.path)
}

export async function POST(req: Request, ctx: RouteContext) {
  const params = await ctx.params
  return proxy(req, params.path)
}

export async function PUT(req: Request, ctx: RouteContext) {
  const params = await ctx.params
  return proxy(req, params.path)
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const params = await ctx.params
  return proxy(req, params.path)
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const params = await ctx.params
  return proxy(req, params.path)
}
