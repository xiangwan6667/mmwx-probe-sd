// MMWX adaptation (2026-09-30): host integration; see licenses/NezhaDash-NOTICE.md.
import { getProbe } from "../../bridge"
import { summarizeTraffic } from "../../../traffic-display"
import { Card, CardContent } from "@/components/ui/card"
import { useStatus } from "@/hooks/use-status"
import { formatBytes } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

type ServerOverviewProps = {
  online: number
  offline: number
  total: number
  up: number
  down: number
  upSpeed: number
  downSpeed: number
}

export default function ServerOverview({ online, offline, total }: ServerOverviewProps) {
  const { t } = useTranslation()
  const traffic = summarizeTraffic(getProbe().servers || [])
  const { status, setStatus } = useStatus()

  // @ts-expect-error DisableAnimatedMan is a global variable
  const disableAnimatedMan = window.DisableAnimatedMan !== false

  // @ts-expect-error CustomIllustration is a global variable
  const customIllustration = window.CustomIllustration || "/nezhadash/animated-man.webp"

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  return (
    <>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4 server-overview">
        <Card
          onClick={() => {
            setStatus("all")
          }}
          className={cn("hover:border-blue-500 cursor-pointer transition-all", {
            "bg-card/70": customBackgroundImage,
          })}
        >
          <CardContent className="flex h-full items-center px-6 py-3">
            <section className="flex flex-col gap-1">
              <p className="text-sm font-medium md:text-base">{t("serverOverview.totalServers")}</p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                </span>
                <div className="text-lg font-semibold">{total}</div>
              </div>
            </section>
          </CardContent>
        </Card>
        <Card
          onClick={() => {
            setStatus("online")
          }}
          className={cn(
            "cursor-pointer hover:ring-green-500 ring-1 ring-transparent transition-all",
            {
              "bg-card/70": customBackgroundImage,
            },
            {
              "ring-green-500 ring-2 border-transparent": status === "online",
            },
          )}
        >
          <CardContent className="flex h-full items-center px-6 py-3">
            <section className="flex flex-col gap-1">
              <p className="text-sm font-medium md:text-base">{t("serverOverview.onlineServers")}</p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>

                <div className="text-lg font-semibold">{online}</div>
              </div>
            </section>
          </CardContent>
        </Card>
        <Card
          onClick={() => {
            setStatus("offline")
          }}
          className={cn(
            "cursor-pointer hover:ring-red-500 ring-1 ring-transparent transition-all",
            {
              "bg-card/70": customBackgroundImage,
            },
            {
              "ring-red-500 ring-2 border-transparent": status === "offline",
            },
          )}
        >
          <CardContent className="flex h-full items-center px-6 py-3">
            <section className="flex flex-col gap-1">
              <p className="text-sm font-medium md:text-base">{t("serverOverview.offlineServers")}</p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
                <div className="text-lg font-semibold">{offline}</div>
              </div>
            </section>
          </CardContent>
        </Card>
        {Number.isFinite(traffic.used) && (<Card
          className={cn("hover:ring-purple-500 ring-1 ring-transparent transition-all", {
            "bg-card/70": customBackgroundImage,
          })}
        >
          <CardContent className="flex h-full items-center relative px-6 py-3">
            <section className="flex flex-col gap-1 w-full">
              <div className="flex items-center w-full justify-between">
                <p className="text-sm font-medium md:text-base">已用流量</p>
              </div>
              <p className="text-lg font-semibold">{formatBytes(traffic.used)}</p>
            </section>
            {!disableAnimatedMan && (
              <img
                className="absolute right-3 top-[-85px] z-50 w-20 scale-90 group-hover:opacity-50 md:scale-100 transition-all"
                alt={"animated-man"}
                src={customIllustration}
                loading="eager"
              />
            )}
          </CardContent>
        </Card>)}
      </section>
    </>
  )
}
