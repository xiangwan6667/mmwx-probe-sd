// MMWX adaptation (2026-09-30): host integration; see licenses/NezhaDash-NOTICE.md.
// MMWX adaptation (2026-09-29): BITJEBE TrafficBar with authoritative billable usage and period end; see licenses/NezhaDash-NOTICE.md.
import { formatBytes } from "@/lib/format"
import { useEffect, useRef, useState } from "react"

interface TrafficBarProps {
  used?: number
  limit: number
  periodEnd?: string
  billingMode?: string
  now: number
}

function calcResetDays(periodEnd: string | undefined, now: number): string | undefined {
  if (!periodEnd) return undefined
  const reset = new Date(periodEnd).getTime()
  if (!Number.isFinite(reset)) return undefined
  return reset <= now ? "周期已结束" : Math.ceil((reset - now) / 86400000) + "日"
}

function getColor(percent: number): string {
  return `hsl(${(100 - percent) * 1.4}, 70%, 50%)`
}

export default function TrafficBar({ used, limit, periodEnd, billingMode, now }: TrafficBarProps) {
  const [infoIndex, setInfoIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const win = window as unknown as Record<string, unknown>
  const showPercent = win.TrafficBarShowPercent !== false
  const showResetDay = win.TrafficBarShowResetDay !== false
  const showBillingMode = win.TrafficBarShowBillingMode !== false

  const hasUsage = used !== undefined && Number.isFinite(used)
  const usagePercent = hasUsage && limit > 0 ? Math.max(0, (used / limit) * 100) : 0
  const percent = Math.min(100, usagePercent)
  const percentStr = usagePercent.toFixed(2)
  const usedFormatted = hasUsage ? formatBytes(used) : "—"
  const limitFormatted = formatBytes(limit)
  const resetDays = calcResetDays(periodEnd, now)

  // 根据设置构建要显示的信息项
  const infoItems: string[] = []
  if (showPercent) infoItems.push(hasUsage ? `${percentStr}%` : "用量未知")
  if (showResetDay && resetDays) infoItems.push(`周期结束: ${resetDays}`)
  if (showBillingMode && billingMode) infoItems.push(`计费: ${billingMode}`)

  const shouldCycle = infoItems.length > 1

  useEffect(() => {
    if (!shouldCycle) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return
    }
    timerRef.current = setInterval(() => {
      setFading(true)
      fadeRef.current = setTimeout(() => {
        setInfoIndex((prev) => (prev + 1) % infoItems.length)
        setFading(false)
      }, 500)
    }, 3000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (fadeRef.current) clearTimeout(fadeRef.current)
    }
  }, [shouldCycle, infoItems.length])

  if (!hasUsage || !Number.isFinite(limit) || limit <= 0) return null

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
            {usedFormatted}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
            / {limitFormatted}
          </span>
        </div>
        {infoItems.length > 0 && (
          shouldCycle ? (
            <div
              className="text-[10px] font-medium text-neutral-600 dark:text-neutral-300 transition-opacity duration-500"
              style={{ opacity: fading ? 0 : 1 }}
            >
              {infoItems[infoIndex % infoItems.length]}
            </div>
          ) : (
            <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
              {infoItems[0]}
            </span>
          )
        )}
      </div>
      <div className="relative h-1.5 w-full">
        <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
        <div
          className="absolute inset-0 rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            backgroundColor: getColor(percent),
          }}
        />
      </div>
    </div>
  )
}
