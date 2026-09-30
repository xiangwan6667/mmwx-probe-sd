// MMWX adaptation (2026-09-30): host integration; see licenses/NezhaDash-NOTICE.md.
import { useQuery } from "@tanstack/react-query"
import { resourceHistory } from "../../resource-history"
import { getProbe } from "../../bridge"
import { probeRangeOptions } from "../../../probe-ranges"
import { TimeRangeMenu } from "../../TimeRangeMenu"
import type { MetricPeriod } from "@/types/nezha-api"
import { Card, CardContent } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { formatBytes } from "@/lib/format"
import { cn, formatNezhaInfo, formatRelativeTime } from "@/lib/utils"
import { NezhaServer, NezhaWebsocketResponse } from "@/types/nezha-api"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ServerDetailChartLoading } from "./loading/ServerDetailLoading"
import AnimatedCircularProgressBar from "./ui/animated-circular-progress-bar"

type cpuChartData = {
  timeStamp: string
  cpu: number
}

type processChartData = {
  timeStamp: string
  process: number
}

type diskChartData = {
  timeStamp: string
  disk: number
}

type memChartData = {
  timeStamp: string
  mem: number
  swap: number
}

type networkChartData = {
  timeStamp: string
  upload: number
  download: number
}

type connectChartData = {
  timeStamp: string
  tcp: number
  udp: number
}

export default function ServerDetailChart({ server_id }: { server_id: string }) {
 const [range, setRange] = useState<string>("realtime")
 const {data: savedHistory, isLoading, error} = useQuery({queryKey:["bitjebe-resource-history",server_id,range],queryFn:()=>resourceHistory(Number(server_id),range as MetricPeriod),enabled:range !== "realtime"})
 return <div>
 <TimeRangeMenu label="资源图表时间范围" value={range} onValueChange={setRange} className="mb-3" options={[{key: "realtime", label: "实时"}, ...probeRangeOptions(getProbe().history_days)]} />
 {error ? <p className="text-sm text-muted-foreground">历史数据暂不可用</p> : isLoading ? <ServerDetailChartLoading /> : <ResourceCharts key={range} server_id={server_id} savedHistory={range === "realtime" ? undefined : savedHistory || []} />}
 </div>
}
function ResourceCharts({server_id,savedHistory}:{server_id:string;savedHistory?:{data:string}[]}) {
  const { lastMessage, connected, messageHistory: liveHistory } = useWebSocketContext()
 const messageHistory = savedHistory ?? liveHistory
 const chartMessage = savedHistory ? savedHistory[0] : lastMessage

  if (!connected && !lastMessage) {
    return <ServerDetailChartLoading />
  }

  const nezhaWsData = chartMessage ? (JSON.parse(chartMessage.data) as NezhaWebsocketResponse) : null

  if (!nezhaWsData) {
    return <ServerDetailChartLoading />
  }

  const server = nezhaWsData.servers.find((s) => s.id === Number(server_id))
  if (server && savedHistory) {
    for (const row of savedHistory) {
      const sample = (JSON.parse(row.data) as NezhaWebsocketResponse).servers.find(item => item.id === server.id)
      if (!sample) continue
      for (const key of Object.keys(sample.state) as (keyof typeof sample.state)[]) {
        if (typeof server.state[key] !== "number" && typeof sample.state[key] === "number" && Number.isFinite(sample.state[key])) (server.state as unknown as Record<string, unknown>)[key] = sample.state[key]
      }
    }
  }

  if (!server) {
    return <ServerDetailChartLoading />
  }

  return (
    <section className="grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-3 server-charts">
      {Number.isFinite(server.state.cpu) && <CpuChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />}
      {Number.isFinite(server.state.process_count) && <ProcessChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />}
      {Number.isFinite(server.state.disk_used) && Number.isFinite(server.host.disk_total) && server.host.disk_total > 0 && <DiskChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />}
      {Number.isFinite(server.state.mem_used) && Number.isFinite(server.host.mem_total) && server.host.mem_total > 0 && <MemChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />}
      {(Number.isFinite(server.state.net_out_speed) || Number.isFinite(server.state.net_in_speed)) && <NetworkChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />}
      {(Number.isFinite(server.state.tcp_conn_count) || Number.isFinite(server.state.udp_conn_count)) && <ConnectChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />}
    </section>
  )
}

function CpuChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const [cpuChartData, setCpuChartData] = useState<cpuChartData[]>([])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const { cpu } = formatNezhaInfo(now, data)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { cpu } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            cpu: cpu,
          }
        })
        .filter((item): item is cpuChartData => item !== null)
        .reverse() // 保持时间顺序

      setCpuChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 更新实时数据
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = now.toString()
      setCpuChartData((prevData) => {
        let newData = [] as cpuChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, cpu: cpu },
            { timeStamp: timestamp, cpu: cpu },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, cpu: cpu }]
          if (messageHistory.length <= 120 && newData.length > 120) {
            newData.shift()
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  const chartConfig = {
    cpu: {
      label: "CPU",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-md font-medium">CPU</p>
            <section className="flex items-center gap-2">
              <p className="text-xs text-end w-10 font-medium">{cpu.toFixed(2)}%</p>
              <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={cpu} primaryColor="hsl(var(--chart-1))" />
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={cpuChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Area isAnimationActive={false} dataKey="cpu" type="step" fill="hsl(var(--chart-1))" fillOpacity={0.3} stroke="hsl(var(--chart-1))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function ProcessChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const { t } = useTranslation()
  const [processChartData, setProcessChartData] = useState([] as processChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { process } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { process } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            process,
          }
        })
        .filter((item): item is processChartData => item !== null)
        .reverse()

      setProcessChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = now.toString()
      setProcessChartData((prevData) => {
        let newData = [] as processChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, process },
            { timeStamp: timestamp, process },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, process }]
          if (messageHistory.length <= 120 && newData.length > 120) {
            newData.shift()
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  const chartConfig = {
    process: {
      label: "Process",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-md font-medium">{t("serverDetailChart.process")}</p>
            <section className="flex items-center gap-2">
              <p className="text-xs text-end w-10 font-medium">{process}</p>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={processChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} />
              <Area
                isAnimationActive={false}
                dataKey="process"
                type="step"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.3}
                stroke="hsl(var(--chart-2))"
              />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function MemChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const { t } = useTranslation()
  const [memChartData, setMemChartData] = useState([] as memChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { mem, swap } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { mem, swap } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            mem,
            swap,
          }
        })
        .filter((item): item is memChartData => item !== null)
        .reverse()

      setMemChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = now.toString()
      setMemChartData((prevData) => {
        let newData = [] as memChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, mem, swap },
            { timeStamp: timestamp, mem, swap },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, mem, swap }]
          if (messageHistory.length <= 120 && newData.length > 120) {
            newData.shift()
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  const chartConfig = {
    mem: {
      label: "Mem",
    },
    swap: {
      label: "Swap",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <section className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className=" text-xs text-muted-foreground">{t("serverDetailChart.mem")}</p>
                <div className="flex items-center gap-2">
                  <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={mem} primaryColor="hsl(var(--chart-8))" />
                  <p className="text-xs font-medium">{mem.toFixed(0)}%</p>
                </div>
              </div>
              {Number.isFinite(swap) && (<div className="flex flex-col">
                <p className=" text-xs text-muted-foreground">{t("serverDetailChart.swap")}</p>
                <div className="flex items-center gap-2">
                  <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={swap} primaryColor="hsl(var(--chart-10))" />
                  <p className="text-xs font-medium">{swap.toFixed(0)}%</p>
                </div>
              </div>)}
            </section>
            <section className="flex flex-col items-end gap-0.5">
              <div className="flex text-[11px] font-medium items-center gap-2">
                {formatBytes(data.state.mem_used)} / {formatBytes(data.host.mem_total)}
              </div>
              <div className="flex text-[11px] font-medium items-center gap-2">
                {Number.isFinite(data.host.swap_total) && data.host.swap_total > 0 && Number.isFinite(data.state.swap_used) ? (
                  <>
                    swap: {formatBytes(data.state.swap_used)} / {formatBytes(data.host.swap_total)}
                  </>
                ) : (
                  <></>
                )}
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={memChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Area isAnimationActive={false} dataKey="mem" type="step" fill="hsl(var(--chart-8))" fillOpacity={0.3} stroke="hsl(var(--chart-8))" />
              <Area
                isAnimationActive={false}
                dataKey="swap"
                type="step"
                fill="hsl(var(--chart-10))"
                fillOpacity={0.3}
                stroke="hsl(var(--chart-10))"
              />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function DiskChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const { t } = useTranslation()
  const [diskChartData, setDiskChartData] = useState([] as diskChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { disk } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { disk } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            disk,
          }
        })
        .filter((item): item is diskChartData => item !== null)
        .reverse()

      setDiskChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = now.toString()
      setDiskChartData((prevData) => {
        let newData = [] as diskChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, disk },
            { timeStamp: timestamp, disk },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, disk }]
          if (messageHistory.length <= 120 && newData.length > 120) {
            newData.shift()
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  const chartConfig = {
    disk: {
      label: "Disk",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-md font-medium">{t("serverDetailChart.disk")}</p>
            <section className="flex flex-col items-end gap-0.5">
              <section className="flex items-center gap-2">
                <p className="text-xs text-end w-10 font-medium">{disk.toFixed(0)}%</p>
                <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={disk} primaryColor="hsl(var(--chart-5))" />
              </section>
              <div className="flex text-[11px] font-medium items-center gap-2">
                {formatBytes(data.state.disk_used)} / {formatBytes(data.host.disk_total)}
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={diskChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Area isAnimationActive={false} dataKey="disk" type="step" fill="hsl(var(--chart-5))" fillOpacity={0.3} stroke="hsl(var(--chart-5))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function NetworkChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const { t } = useTranslation()
  const [networkChartData, setNetworkChartData] = useState([] as networkChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { up, down } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { up, down } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            upload: up,
            download: down,
          }
        })
        .filter((item): item is networkChartData => item !== null)
        .reverse()

      setNetworkChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = now.toString()
      setNetworkChartData((prevData) => {
        let newData = [] as networkChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, upload: up, download: down },
            { timeStamp: timestamp, upload: up, download: down },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, upload: up, download: down }]
          if (messageHistory.length <= 120 && newData.length > 120) {
            newData.shift()
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  let maxDownload = Math.max(...networkChartData.map((item) => item.download))
  maxDownload = Math.ceil(maxDownload)
  if (maxDownload < 1) {
    maxDownload = 1
  }

  const chartConfig = {
    upload: {
      label: "Upload",
    },
    download: {
      label: "Download",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center">
            <section className="flex items-center gap-4">
              <div className="flex flex-col w-20">
                <p className="text-xs text-muted-foreground">{t("serverDetailChart.upload")}</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex  size-1.5 rounded-full bg-[hsl(var(--chart-1))]"></span>
                  <p className="text-xs font-medium">
                    {up >= 1024 ? `${(up / 1024).toFixed(2)}G/s` : up >= 1 ? `${up.toFixed(2)}M/s` : `${(up * 1024).toFixed(2)}K/s`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col w-20">
                <p className=" text-xs text-muted-foreground">{t("serverDetailChart.download")}</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex  size-1.5 rounded-full bg-[hsl(var(--chart-4))]"></span>
                  <p className="text-xs font-medium">
                    {down >= 1024 ? `${(down / 1024).toFixed(2)}G/s` : down >= 1 ? `${down.toFixed(2)}M/s` : `${(down * 1024).toFixed(2)}K/s`}
                  </p>
                </div>
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <LineChart
              accessibilityLayer
              data={networkChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                mirror={true}
                tickMargin={-15}
                type="number"
                minTickGap={50}
                interval="preserveStartEnd"
                domain={[0, maxDownload]}
                tickFormatter={(value) => `${value.toFixed(0)}M/s`}
              />
              <Line isAnimationActive={false} dataKey="upload" type="linear" stroke="hsl(var(--chart-1))" strokeWidth={1} dot={false} />
              <Line isAnimationActive={false} dataKey="download" type="linear" stroke="hsl(var(--chart-4))" strokeWidth={1} dot={false} />
            </LineChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function ConnectChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const [connectChartData, setConnectChartData] = useState([] as connectChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { tcp, udp } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { tcp, udp } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            tcp,
            udp,
          }
        })
        .filter((item): item is connectChartData => item !== null)
        .reverse()

      setConnectChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = now.toString()
      setConnectChartData((prevData) => {
        let newData = [] as connectChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, tcp, udp },
            { timeStamp: timestamp, tcp, udp },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, tcp, udp }]
          if (messageHistory.length <= 120 && newData.length > 120) {
            newData.shift()
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  const chartConfig = {
    tcp: {
      label: "TCP",
    },
    udp: {
      label: "UDP",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center">
            <section className="flex items-center gap-4">
              <div className="flex flex-col w-12">
                <p className="text-xs text-muted-foreground">TCP</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex  size-1.5 rounded-full bg-[hsl(var(--chart-1))]"></span>
                  <p className="text-xs font-medium">{tcp}</p>
                </div>
              </div>
              <div className="flex flex-col w-12">
                <p className=" text-xs text-muted-foreground">UDP</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex  size-1.5 rounded-full bg-[hsl(var(--chart-4))]"></span>
                  <p className="text-xs font-medium">{udp}</p>
                </div>
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <LineChart
              accessibilityLayer
              data={connectChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} type="number" interval="preserveStartEnd" />
              <Line isAnimationActive={false} dataKey="tcp" type="linear" stroke="hsl(var(--chart-1))" strokeWidth={1} dot={false} />
              <Line isAnimationActive={false} dataKey="udp" type="linear" stroke="hsl(var(--chart-4))" strokeWidth={1} dot={false} />
            </LineChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}
