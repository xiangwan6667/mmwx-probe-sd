// MMWX adaptation (2026-09-30): host integration; see licenses/NezhaDash-NOTICE.md.
import { cn } from "@/lib/utils"
import { hasFlag } from "country-flag-icons"
import getUnicodeFlagIcon from "country-flag-icons/unicode"

export default function ServerFlag({ country_code, className }: { country_code: string; className?: string }) {
  const code = country_code.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code) || !hasFlag(code)) return null
  return <span className={cn("text-[12px] text-muted-foreground", className)}><span className={`fi fi-${code.toLowerCase()}`} role="img" aria-label={getUnicodeFlagIcon(code)} /></span>
}
