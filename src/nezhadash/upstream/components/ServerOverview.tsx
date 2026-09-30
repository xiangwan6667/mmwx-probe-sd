// MMWX adaptation (2026-09-29): host data/theme/router integration; see licenses/NezhaDash-NOTICE.md.
import { getProbe } from "../../bridge";
import { summarizeTraffic } from "../../../traffic-display";
import {
	ArrowDownCircleIcon,
	ArrowUpCircleIcon,
} from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { useStatus } from "@/hooks/use-status";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import NumericText from "./NumericText";

type ServerOverviewProps = {
	online: number;
	offline: number;
	total: number;
	up: number;
	down: number;
	upSpeed: number;
	downSpeed: number;
};

export default function ServerOverview({
	online,
	offline,
	total,
}: ServerOverviewProps) {
	const { t } = useTranslation();
	const { status, setStatus } = useStatus();
	const servers = getProbe().servers || [];
	const traffic = summarizeTraffic(servers);
	const hasUp = Number.isFinite(traffic.uplink);
	const hasDown = Number.isFinite(traffic.downlink);
	const hasUpSpeed = Number.isFinite(traffic.uploadSpeed);
	const hasDownSpeed = Number.isFinite(traffic.downloadSpeed);

	const customBackgroundImage =
		(window.CustomBackgroundImage as string) !== ""
			? window.CustomBackgroundImage
			: undefined;

	return (
		<section className="grid grid-cols-2 gap-4 lg:grid-cols-4 server-overview">
			<Card
				onClick={() => {
					setStatus("all");
				}}
				className={cn(
					"hover:border-blue-500 cursor-pointer transition-all",
					{
						"bg-card/70": customBackgroundImage,
					},
				)}
			>
				<CardContent className="flex h-full items-center px-6 py-3">
					<section className="flex flex-col gap-1">
						<p className="text-sm font-medium md:text-base">
							{t("serverOverview.totalServers")}
						</p>
						<div className="flex items-center gap-2">
							<span className="relative flex h-2 w-2">
								<span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
							</span>
							<NumericText value={total} className="text-lg font-semibold" />
						</div>
					</section>
				</CardContent>
			</Card>
			<Card
				onClick={() => {
					setStatus("online");
				}}
				className={cn(
					"cursor-pointer hover:ring-green-500 ring-1 ring-transparent transition-all",
					{
						"bg-card/70": customBackgroundImage,
					},
					{
						"border-transparent ring-2 ring-green-500":
							status === "online",
					},
				)}
			>
				<CardContent className="flex h-full items-center px-6 py-3">
					<section className="flex flex-col gap-1">
						<p className="text-sm font-medium md:text-base">
							{t("serverOverview.onlineServers")}
						</p>
						<div className="flex items-center gap-2">
							<span className="relative flex h-2 w-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
								<span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
							</span>
							<NumericText value={online} className="text-lg font-semibold" />
						</div>
					</section>
				</CardContent>
			</Card>
			<Card
				onClick={() => {
					setStatus("offline");
				}}
				className={cn(
					"cursor-pointer hover:ring-red-500 ring-1 ring-transparent transition-all",
					{
						"bg-card/70": customBackgroundImage,
					},
					{
						"border-transparent ring-2 ring-red-500":
							status === "offline",
					},
				)}
			>
				<CardContent className="flex h-full items-center px-6 py-3">
					<section className="flex flex-col gap-1">
						<p className="text-sm font-medium md:text-base">
							{t("serverOverview.offlineServers")}
						</p>
						<div className="flex items-center gap-2">
							<span className="relative flex h-2 w-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
								<span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
							</span>
							<NumericText value={offline} className="text-lg font-semibold" />
						</div>
					</section>
				</CardContent>
			</Card>
			{(hasUp || hasDown || Number.isFinite(traffic.used) || hasUpSpeed || hasDownSpeed) && (<Card
				className={cn(
					"hover:ring-purple-500 ring-1 ring-transparent transition-all",
					{
						"bg-card/70": customBackgroundImage,
					},
				)}
			>
				<CardContent className="flex h-full items-center relative px-6 py-3">
					<section className="flex flex-col gap-1 w-full">
						<div className="flex items-center w-full justify-between">
							<p className="text-sm font-medium md:text-base">
								周期流量
							</p>
						</div>
						<section title="各服务器当前周期原始上/下行，含离线服务器；计费用量按主控规则和调整计算" className="flex items-start flex-row z-10 pr-0 gap-1">
							{hasUp && (<NumericText
								value={`↑${hasUp ? formatBytes(traffic.uplink) : "—"}`}
								className="sm:text-[12px] text-[10px] text-blue-800 dark:text-blue-400  text-nowrap font-medium"
							/>)}
							{hasDown && (<NumericText
								value={`↓${hasDown ? formatBytes(traffic.downlink) : "—"}`}
								className="sm:text-[12px] text-[10px]  text-purple-800 dark:text-purple-400  text-nowrap font-medium"
							/>)}
						</section>
						{Number.isFinite(traffic.used) && (<p className="text-[11px] text-muted-foreground">计费用量 {Number.isFinite(traffic.used) ? formatBytes(traffic.used) : "—"}</p>)}
						<section className="flex flex-col sm:flex-row -mr-1 sm:items-center items-start gap-1">
							{hasUpSpeed && (<p className="text-[11px] flex items-center text-nowrap font-semibold">
								<ArrowUpCircleIcon className="size-3 mr-0.5 sm:mb-px" />
								{hasUpSpeed ? `${formatBytes(traffic.uploadSpeed)}/s` : "—"}
							</p>)}
							{hasDownSpeed && (<p className="text-[11px] flex items-center  text-nowrap font-semibold">
								<ArrowDownCircleIcon className="size-3 mr-0.5" />
								{hasDownSpeed ? `${formatBytes(traffic.downloadSpeed)}/s` : "—"}
							</p>)}
						</section>
					</section>
				</CardContent>
			</Card>)}
		</section>
	);
}

