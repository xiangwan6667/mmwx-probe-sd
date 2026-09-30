// MMWX adaptation (2026-09-30): host integration; see licenses/NezhaDash-NOTICE.md.
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function PrivateAccessGate({ siteName, siteDesc }: { siteName: string; siteDesc?: string }) {
  const customLogo = ((window as unknown as Record<string, unknown>).CustomLogo as string) || "/favicon.ico"

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm space-y-5 rounded-3xl border-neutral-200/70 bg-white/85 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/80">
        <section className="flex items-center gap-3">
          <img src={customLogo} alt="site logo" className="h-10 w-10 rounded-xl object-cover" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{siteName || "Komari"}</h1>
            <p className="truncate text-xs text-muted-foreground">{siteDesc || "Private monitor"}</p>
          </div>
        </section>
        <section className="space-y-2">
          <p className="text-sm font-medium">该监控站点已开启私密模式</p>
          <p className="text-xs leading-5 text-muted-foreground">访问机器信息前必须先登录主控管理员账号。</p>
        </section>
        <div className="space-y-2">
          <Button asChild className="w-full rounded-full">
            <button onClick={() => window.parent.postMessage({ type: "mmwx-probe-login" }, window.location.origin)}>管理员登录</button>
          </Button>
          <Button variant="outline" className="w-full rounded-full" onClick={() => window.location.reload()}>
            我已登录，刷新页面
          </Button>
        </div>
      </Card>
    </div>
  )
}
