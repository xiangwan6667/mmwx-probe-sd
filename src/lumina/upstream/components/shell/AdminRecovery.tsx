import { useEffect, useState } from "react";
import {
  getAdminDestination,
  repairKomariServiceWorker,
  updateKomariServiceWorker,
} from "@lumina/utils/komariServiceWorker";

type RecoveryState = "updating" | "waiting" | "manual" | "repairing" | "failed";

export function AdminRecovery() {
  const [state, setState] = useState<RecoveryState>("updating");

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setState("manual");
    }, 4_000);
    void updateKomariServiceWorker()
      .then((result) => {
        if (active) setState(result === "requested" ? "waiting" : "manual");
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const repair = async () => {
    setState("repairing");
    try {
      await repairKomariServiceWorker();
      window.location.replace(getAdminDestination(window.location));
    } catch {
      setState("failed");
    }
  };

  const message = {
    updating: "正在更新后台缓存…",
    waiting: "已请求更新，等待新版后台接管。",
    manual: "自动更新未完成，可手动修复后进入后台。",
    repairing: "正在清理旧缓存…",
    failed: "修复失败，请清除该站点的数据后重试。",
  }[state];

  return (
    <main className="flex min-h-screen items-center justify-center px-5 text-center">
      <div className="flex max-w-md flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          正在恢复后台入口
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)]">{message}</p>
        {state !== "updating" && state !== "repairing" && (
          <button
            type="button"
            className="control-button px-5 py-2 text-[13px] font-medium"
            onClick={() => void repair()}
          >
            修复并进入后台
          </button>
        )}
      </div>
    </main>
  );
}
