"use client"

import { useState } from "react"
import Image from "next/image"
import { Eye, EyeOff, Lock, Mail, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"

export function LoginPage() {
  const { login, failedAttempts, isLocked } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked) return
    setError("")
    setIsLoading(true)

    const success = await login(email, password)
    if (!success) {
      setError("Invalid credentials. Please try again.")
    }
    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Full-screen blurred background image */}

      {/* Repeating watermark pattern of UDSM logo at 5% opacity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url(/images/udsm-logo.png)",
          backgroundSize: "120px 120px",
          backgroundRepeat: "repeat",
          opacity: 0.05,
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-[420px] px-4">
        <div className="oval-smart-shape card-elevated overflow-hidden border border-primary/10 bg-card">
          {/* Card header */}
          <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-2">
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#f8f9fb]">
              <Image
                src="/images/udsm-logo.png"
                alt="University of Dar es Salaam Logo"
                width={72}
                height={72}
                className="object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold tracking-tight text-[#0864af]">
                VoIP Portal
              </h1>
              <p className="mt-0.5 text-[13px] font-medium text-[#5c6370]">
                University of Dar es Salaam
              </p>
            </div>
          </div>

          {/* Thin gold accent line */}
          <div className="mx-8 my-4 h-px bg-gradient-to-r from-transparent via-[#f6b418] to-transparent" />

          {/* Form */}
          <div className="px-8 pb-6 flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isLocked && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Account locked due to multiple failed attempts. Try again in 30 seconds.</p>
                </div>
              )}

              {error && !isLocked && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {failedAttempts > 0 && failedAttempts < 5 && !isLocked && (
                <p className="text-center text-xs font-medium text-amber-600">
                  {`Failed attempts: ${failedAttempts}/5`}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-[13px] font-semibold text-[#1a1d23]">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@udsm.ac.tz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 border-[#e2e6ed] bg-[#f8f9fb] pl-10 text-[14px] text-[#1a1d23] placeholder:text-[#9ca3af] focus:border-[#0864af] focus:ring-[#0864af]"
                    disabled={isLocked}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-[13px] font-semibold text-[#1a1d23]">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 border-[#e2e6ed] bg-[#f8f9fb] pl-10 pr-10 text-[14px] text-[#1a1d23] placeholder:text-[#9ca3af] focus:border-[#0864af] focus:ring-[#0864af]"
                    disabled={isLocked}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] transition-colors hover:text-[#1a1d23]"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLocked || isLoading}
                className="mt-1 h-10 w-full bg-[#0864af] text-[14px] font-semibold text-white transition-colors hover:bg-[#064d8a]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Security indicator */}


          </div>

          {/* Footer */}
          <div className="border-t border-[#e2e6ed] bg-[#f8f9fb] px-8 py-3.5">
            <p className="text-center text-[11px] text-[#9ca3af]">
              Managed by UDSM Computing Centre (UCC)
            </p>
          </div>
        </div>

        {/* Below-card copyright */}
        <p className="mt-6 text-center text-[11px] text-white/50">
          {"© 2026 University of Dar es Salaam. All rights reserved."}
        </p>
      </div>
    </div>
  )
}
