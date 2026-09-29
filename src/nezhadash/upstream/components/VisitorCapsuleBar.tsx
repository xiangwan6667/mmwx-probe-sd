// Adapted from BITJEBE/nezha-BITJEBE (Apache-2.0); MMWX changes described in licenses/NezhaDash-NOTICE.md.
import { Globe2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { CAPSULE_COLORS, resolveThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

type VisitorInfo = {
  ip: string
  country: string
  code: string
  org: string
}

async function fetchVisitorInfo(signal: AbortSignal): Promise<VisitorInfo> {
  const response = await fetch("/api/visitor", {cache: "no-store", signal})
  if (!response.ok || response.status === 204) throw new Error("Visitor information unavailable")
  const data = await response.json() as Partial<VisitorInfo>
  if (typeof data.ip !== "string" || !data.ip) throw new Error("Visitor IP is missing")
  return {ip: data.ip, country: data.country || "未知地区", code: data.code || "", org: data.org || "未知运营商"}
}

export default function VisitorCapsuleBar() {
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo | null>(null)
  const [hasError, setHasError] = useState(false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    let mounted = true
    const showTimer = window.setTimeout(() => setActive(true), 1000)
    const hideTimer = window.setTimeout(() => setActive(false), 12000)

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4500)
    fetchVisitorInfo(controller.signal)
      .then((info) => {
        if (mounted) {
          setVisitorInfo(info)
        }
      })
      .catch(() => {
        if (mounted) {
          setHasError(true)
        }
      })

    return () => {
      mounted = false
      controller.abort()
      window.clearTimeout(timeout)
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  const canShowFlag = visitorInfo?.code && /^[A-Z]{2}$/.test(visitorInfo.code) && visitorInfo.code !== "UN"

  const palette = useMemo(() => {
    const colorKey = resolveThemeColor((window as unknown as Record<string, unknown>).VisitorCapsuleColor)
    return CAPSULE_COLORS[colorKey]
  }, [])

  return (
    <div
      role="status"
      aria-label="访客信息"
      className={cn(
        "visitor-capsule fixed bottom-[30px] left-1/2 z-[10001] flex max-w-[95vw] -translate-x-1/2 translate-y-[50px] items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2 text-[13px] font-medium opacity-0 backdrop-blur-xl transition-all duration-700 max-[768px]:bottom-4 max-[768px]:scale-75 max-[768px]:px-3 max-[768px]:py-1.5 max-[768px]:text-xs",
        palette.container,
        active ? "translate-y-0 opacity-100" : "pointer-events-none invisible",
      )}
    >
      <span className={cn("flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border", palette.iconWrap)}>
        {canShowFlag ? (
          <span className={`fi fi-${visitorInfo.code.toLowerCase()} size-full`} role="img" aria-label={visitorInfo.code} />
        ) : (
          <Globe2 className="size-4" />
        )}
      </span>
      {visitorInfo ? (
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate" title={visitorInfo.ip}>
            <span className={cn("font-semibold", palette.ipLabel)}>IP:</span> {visitorInfo.ip}
          </span>
          <span className={cn("h-3 w-px", palette.divider)} />
          <span className="max-[768px]:hidden">{visitorInfo.country}</span>
          <span className="hidden max-[768px]:inline">{visitorInfo.code}</span>
          <span className={cn("h-3 w-px", palette.divider)} />
          <span className="inline-block max-w-[140px] overflow-hidden text-ellipsis align-bottom" title={visitorInfo.org}>
            {visitorInfo.org}
          </span>
        </span>
      ) : hasError ? (
        <span className="flex items-center gap-2">
          <span className={cn("font-semibold", palette.errorAccent)}>你好</span>
          <span className={cn("h-3 w-px", palette.divider)} />
          <span>访客信息暂不可用</span>
        </span>
      ) : (
        <span>正在获取访客信息…</span>
      )}
    </div>
  )
}
