<script setup lang="ts">
import type { NodeData } from '@emerald/stores/nodes'
import { Icon } from '@iconify/vue'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import NodeEarthGlobe from '@emerald/components/NodeEarthGlobe.vue'
import { CardX } from '@emerald/components/ui/card-x'
import { DataTooltip } from '@emerald/components/ui/data-tooltip'
import { useBackgroundSurface } from '@emerald/composables/useBackgroundSurface'
import { useAppStore } from '@emerald/stores/app'
import { useNodesStore } from '@emerald/stores/nodes'
import * as financeHelper from '@emerald/utils/financeHelper'
import { formatBytesPerSecondSplit as originalSpeedSplit, formatBytesSplit as originalBytesSplit } from '@emerald/utils/helper'

const props = defineProps<{
  nodes?: NodeData[]
  globeNodes?: NodeData[]
  transitionKey?: string
}>()

const NodeEarthMaps = defineAsyncComponent(() => import('@emerald/components/NodeEarthMaps.vue'))

const appStore = useAppStore()
const { pickSurfaceClass } = useBackgroundSurface()
const nodesStore = useNodesStore()
const selectedCurrency = ref('USD')
const excludeFreeNodes = ref(true)

const summaryNodes = computed(() => props.nodes ?? nodesStore.nodes)
const summaryTransitionKey = computed(() => props.transitionKey ?? 'all')
const metricSwitchTransitionProps = computed(() => ({
  ...(appStore.disablePageAnimation
    ? { css: false }
    : { name: 'metric-switch', mode: 'out-in' as const }),
}))

const openFinanceCard = ref(false)

function getMetricSwitchStyle(index: number): Record<string, string> {
  return {
    '--metric-switch-delay': `${index * 35}ms`,
  }
}

function setExchangeRateBaseCurrency(event: Event): void {
  const target = event.target as HTMLSelectElement
  selectedCurrency.value = target.value
  if (financeHelper.isSupportedCurrency(target.value)) financeHelper.setStoredFinanceCurrency(target.value)
}

function sumMetric(nodes: NodeData[], key: keyof NodeData): number {
  if (!nodes.length || nodes.some(node => typeof node[key] !== 'number' || !Number.isFinite(node[key]))) return Number.NaN
  return nodes.reduce((sum, node) => sum + (node[key] as number), 0)
}
function formatBytesSplit(value: number, decimals: Parameters<typeof originalBytesSplit>[1]) {
  return Number.isFinite(value) ? originalBytesSplit(value, decimals) : { value: '—', unit: '' }
}
function formatBytesPerSecondSplit(value: number, decimals: Parameters<typeof originalBytesSplit>[1]) {
  return Number.isFinite(value) ? originalSpeedSplit(value, decimals) : { value: '—', unit: '' }
}
const totalSpeed = computed(() => {
  const onlineNodes = summaryNodes.value.filter(node => node.online)
  return { up: sumMetric(onlineNodes, 'net_out'), down: sumMetric(onlineNodes, 'net_in') }
})
const totalTraffic = computed(() => ({ up: sumMetric(summaryNodes.value, 'net_total_up'), down: sumMetric(summaryNodes.value, 'net_total_down') }))

const formattedTrafficUp = computed(() => formatBytesSplit(totalTraffic.value.up, appStore.byteDecimals))
const formattedTrafficDown = computed(() => formatBytesSplit(totalTraffic.value.down, appStore.byteDecimals))
const totalTrafficTooltip = computed(() => formatBytesSplit(totalTraffic.value.up + totalTraffic.value.down, appStore.byteDecimals))

const formattedSpeedUp = computed(() => formatBytesPerSecondSplit(totalSpeed.value.up, appStore.byteDecimals))
const formattedSpeedDown = computed(() => formatBytesPerSecondSplit(totalSpeed.value.down, appStore.byteDecimals))

const totalMemory = computed(() => ({ used: sumMetric(summaryNodes.value, 'ram'), total: sumMetric(summaryNodes.value, 'mem_total') }))
const totalDisk = computed(() => ({ used: sumMetric(summaryNodes.value, 'disk'), total: sumMetric(summaryNodes.value, 'disk_total') }))

const formattedMemoryUsed = computed(() => formatBytesSplit(totalMemory.value.used, appStore.byteDecimals))
const formattedMemoryTotal = computed(() => formatBytesSplit(totalMemory.value.total, appStore.byteDecimals))
const formattedDiskUsed = computed(() => formatBytesSplit(totalDisk.value.used, appStore.byteDecimals))
const formattedDiskTotal = computed(() => formatBytesSplit(totalDisk.value.total, appStore.byteDecimals))

const financeGroups = computed(() => financeHelper.calculateFinanceGroups(summaryNodes.value, excludeFreeNodes.value))
const financeRateCurrencies = computed(() => [...new Set([selectedCurrency.value, ...financeGroups.value.map(group => group.currency)])])
const selectedGroup = computed(() => financeGroups.value.find(group => group.currency === selectedCurrency.value))
const exchangeRateBaseCurrency = computed(() => selectedCurrency.value)
const formattedRemainingValue = computed(() => financeHelper.formatFinanceAmount(selectedGroup.value?.remaining, exchangeRateBaseCurrency.value))
const financeSummaryItems = computed(() => [
  { label: '总价值', ...financeHelper.formatFinanceAmount(selectedGroup.value?.total ?? Number.NaN, exchangeRateBaseCurrency.value) },
  { label: '月均支出', ...financeHelper.formatFinanceAmount(selectedGroup.value?.monthly ?? Number.NaN, exchangeRateBaseCurrency.value) },
  { label: '剩余价值', ...financeHelper.formatFinanceAmount(selectedGroup.value?.remaining ?? Number.NaN, exchangeRateBaseCurrency.value) },
])
const exchangeRateRows = computed(() => financeGroups.value.map(group => ({
  currency: group.currency,
  targetSymbol: financeHelper.formatFinanceAmount(group.remaining, group.currency).symbol,
  rate: financeHelper.formatFinanceAmount(group.remaining, group.currency).value,
})))
const showEarth = computed(() => appStore.earthViewMode === 'earth' || appStore.earthViewMode === 'earth-stop')
const showMaps = computed(() => appStore.earthViewMode === 'maps')
const showVisualPanel = computed(() => showEarth.value || showMaps.value)
const wrapperClass = computed(() => showVisualPanel.value
  ? 'p-4 grid grid-cols-12 grid-rows-1 gap-2 h-auto md:h-58'
  : 'p-4 grid grid-cols-1 gap-2 h-auto')
const cardGridClass = computed(() => showVisualPanel.value
  ? 'h-42 -mt-42 md:mt-0 col-span-12 row-start-3 z-9 md:h-auto md:col-span-6 md:row-start-1 grid grid-cols-12 grid-rows-2 gap-2'
  : 'col-span-1 grid grid-cols-3 md:grid-cols-6 gap-2')

onMounted(() => {
  selectedCurrency.value = financeHelper.getStoredFinanceCurrency()
  excludeFreeNodes.value = financeHelper.shouldExcludeFreeNodes()
})
</script>

<template>
  <div :class="wrapperClass">
    <NodeEarthGlobe v-if="showEarth" :nodes="globeNodes" class="col-span-12 col-start-1 md:col-span-6 md:col-start-7" />
    <NodeEarthMaps v-else-if="showMaps" :nodes="globeNodes" class="col-span-12 col-start-1 md:col-span-6 md:col-start-7" />

    <div :class="cardGridClass">
      <CardX
        hoverable
        class="group h-full border-none rounded-md transition-all"
        :class="[
          pickSurfaceClass('bg-background/60 hover:bg-background', 'bg-background/50 hover:bg-background backdrop-blur-xs'),
          showVisualPanel ? 'col-span-4 row-span-1 col-start-1 row-start-1' : 'col-span-1 row-start-1 col-start-1 min-h-18 md:min-h-24 md:row-start-1 md:col-start-1',
        ]"
        content-class="h-full !p-3"
      >
        <div class="flex h-full flex-col justify-between gap-1">
          <div class="flex items-start justify-between">
            <span class="text-xs font-medium tracking-wider text-muted-foreground">内存用量</span>
            <Icon
              icon="tabler:cash" :width="20" :height="20"
              class="text-slate-500/20 group-hover:text-slate-500 transition-colors"
            />
          </div>
          <Transition v-bind="metricSwitchTransitionProps">
            <div
              :key="`memory-${summaryTransitionKey}`" class="flex items-baseline gap-1 min-w-0"
              :style="getMetricSwitchStyle(0)"
            >
              <span class="text-md md:text-2xl font-bold leading-none tracking-tight">
                {{ formattedMemoryUsed.value }}
              </span>
              <span class="text-[11px] md:text-xs font-medium text-muted-foreground truncate">
                {{ formattedMemoryUsed.unit }} / {{ formattedMemoryTotal.value }} {{ formattedMemoryTotal.unit }}
              </span>
            </div>
          </Transition>
        </div>
      </CardX>
      <CardX
        hoverable
        class="group h-full border-none rounded-md transition-all"
        :class="[
          pickSurfaceClass('bg-background/60 hover:bg-background', 'bg-background/50 hover:bg-background backdrop-blur-xs'),
          showVisualPanel ? 'col-span-4 row-span-1 col-start-1 row-start-2' : 'col-span-1 row-start-2 col-start-1 min-h-18 md:min-h-24 md:row-start-1 md:col-start-2',
        ]"
        content-class="h-full !p-3"
      >
        <div class="flex h-full flex-col justify-between gap-1">
          <div class="flex items-start justify-between">
            <span class="text-xs font-medium tracking-wider text-muted-foreground">硬盘用量</span>
            <Icon
              icon="tabler:server-2" :width="20" :height="20"
              class="text-slate-500/20 group-hover:text-slate-500 transition-colors"
            />
          </div>
          <Transition v-bind="metricSwitchTransitionProps">
            <div
              :key="`disk-${summaryTransitionKey}`" class="flex items-baseline gap-1 min-w-0"
              :style="getMetricSwitchStyle(1)"
            >
              <span class="text-md md:text-2xl font-bold leading-none tracking-tight">{{ formattedDiskUsed.value
              }}</span>
              <span class="text-[11px] md:text-xs font-medium text-muted-foreground truncate">
                {{ formattedDiskUsed.unit }} / {{ formattedDiskTotal.value }} {{ formattedDiskTotal.unit }}
              </span>
            </div>
          </Transition>
        </div>
      </CardX>
      <div
        class="relative w-full h-full"
        :class="showVisualPanel ? 'col-span-4 row-span-1 col-start-5 row-start-1' : 'col-span-1 row-start-1 col-start-2 min-h-18 md:min-h-24 md:row-start-1 md:col-start-3'"
      >
        <CardX
          hoverable
          class="group h-full border-none rounded-md transition-all"
          :class="pickSurfaceClass('bg-background/60 hover:bg-background', 'bg-background/50 hover:bg-background backdrop-blur-xs')"
          content-class="h-full !p-3" @click="openFinanceCard = !openFinanceCard"
        >
          <div class="flex h-full flex-col justify-between gap-1">
            <div class="flex items-start justify-between">
              <span class="text-xs font-medium tracking-wider text-muted-foreground">剩余价值</span>
              <Icon
                icon="tabler:cash" :width="20" :height="20"
                class="text-slate-500/20 group-hover:text-slate-500 transition-colors"
              />
            </div>
            <Transition v-bind="metricSwitchTransitionProps">
              <div
                :key="`remaining-value-${summaryTransitionKey}`" class="flex items-baseline gap-1 min-w-0"
                :style="getMetricSwitchStyle(2)"
              >
                <span class="text-md md:text-2xl font-bold leading-none tracking-tight">
                  {{ formattedRemainingValue.symbol }}{{ formattedRemainingValue.value }}
                </span>
                <span class="block truncate text-[11px] md:text-xs font-medium text-muted-foreground">
                  {{ formattedRemainingValue.currency }}
                </span>
              </div>
            </Transition>
          </div>
        </CardX>
        <CardX
          hoverable
          class="absolute top-0 left-1/2 z-20 h-42 w-[260%] max-w-88 -translate-x-[50%] -translate-y-[25%] rounded-md border-none shadow-[0_0_20px,0_0_0_1px] shadow-emerald-600/10 transition-all"
          :class="[
            pickSurfaceClass('bg-background', 'bg-background/50 backdrop-blur-lg'),
            openFinanceCard ? 'opacity-100 scale-100  -translate-y-[5%]' : 'opacity-0 pointer-events-none scale-50',
          ]"
          content-class="h-full !p-4" @click="openFinanceCard = false"
        >
          <div class="flex h-full min-w-0 flex-col overflow-hidden">
            <div class="shrink-0 grid grid-cols-3 gap-1.5">
              <div v-for="(item, index) in financeSummaryItems" :key="item.label" class="min-w-0">
                <div class="flex mb-1.5 items-center text-xs font-medium text-muted-foreground">
                  {{ item.label }}
                </div>
                <Transition v-bind="metricSwitchTransitionProps">
                  <div
                    :key="`remaining-value-${summaryTransitionKey}-${exchangeRateBaseCurrency}`" class="flex min-w-0 items-baseline truncate"
                    :style="getMetricSwitchStyle(index)"
                  >
                    <span class="shrink-0 text-xs mr-0.5 font-semibold leading-none text-muted-foreground">
                      {{ item.symbol }}
                    </span>
                    <span class=" text-sm md:text-lg font-bold leading-none tracking-tight">
                      {{ item.value }}
                    </span>
                  </div>
                </Transition>
              </div>
            </div>
            <div class="flex-1 my-1.5" />
            <div class="shrink-0 flex flex-col flex-1">
              <div class="flex mb-1 items-center justify-between gap-2">
                <div class="flex items-center gap-1 text-xs font-medium tracking-wider text-muted-foreground">
                  原币种剩余价值
                </div>
                <select
                  :value="exchangeRateBaseCurrency"
                  class="shrink-0 rounded-sm border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus:text-foreground"
                  aria-label="切换统计币种" @click.stop @change.stop="setExchangeRateBaseCurrency"
                >
                  <option v-for="currency in financeRateCurrencies" :key="currency" :value="currency">
                    {{ currency }}
                  </option>
                </select>
              </div>
              <div class="h-15 grid grid-cols-2 gap-y-1 gap-x-4 overflow-auto">
                <div
                  v-for="(row, index) in exchangeRateRows" :key="row.currency"
                  class="text-[11px] flex items-center "
                >
                  <Transition v-bind="metricSwitchTransitionProps">
                    <div :key="`remaining-value-${exchangeRateBaseCurrency}`" class="flex-1 flex justify-between" :style="getMetricSwitchStyle(index)">
                      <span class="text-muted-foreground">
                        {{ row.currency }}
                      </span>
                      <span>
                        {{ row.targetSymbol }}{{ row.rate }}
                      </span>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </div>
        </CardX>
      </div>
      <CardX
        hoverable
        class="group h-full border-none rounded-md transition-all"
        :class="[
          pickSurfaceClass('bg-background/60 hover:bg-background', 'bg-background/50 hover:bg-background backdrop-blur-xs'),
          showVisualPanel ? 'col-span-4 row-span-1 col-start-5 row-start-2' : 'col-span-1 row-start-2 col-start-2 min-h-18 md:min-h-24 md:row-start-1 md:col-start-4',
        ]"
        content-class="h-full !p-3"
      >
        <div class="flex h-full flex-col justify-between gap-1">
          <div class="flex items-start justify-between">
            <span class="text-xs font-medium tracking-wider text-muted-foreground">累计流量</span>
            <Icon
              icon="tabler:download" :width="20" :height="20"
              class="text-slate-500/20 group-hover:text-slate-500 transition-colors"
            />
          </div>
          <DataTooltip
            as="span" placement="top"
            :content="`↑ ${formattedTrafficUp.value} ${formattedTrafficUp.unit}\n↓ ${formattedTrafficDown.value} ${formattedTrafficDown.unit}`"
            class="min-w-0" content-class="whitespace-pre px-2 py-1 left-0 -translate-x-0 leading-normal"
          >
            <Transition v-bind="metricSwitchTransitionProps">
              <div
                :key="`traffic-${summaryTransitionKey}`" class="flex items-baseline gap-1"
                :style="getMetricSwitchStyle(3)"
              >
                <span class="inline-block text-md md:text-2xl font-bold leading-none tracking-tight">
                  {{ totalTrafficTooltip.value }}
                </span>
                <span class="inline-block text-[11px] md:text-xs font-medium text-muted-foreground">
                  {{ totalTrafficTooltip.unit }}
                </span>
              </div>
            </Transition>
          </DataTooltip>
        </div>
      </CardX>

      <CardX
        hoverable
        class="group h-full border-none rounded-md transition-all"
        :class="[
          pickSurfaceClass('bg-background/60 hover:bg-background', 'bg-background/50 hover:bg-background backdrop-blur-xs'),
          showVisualPanel ? 'col-span-4 row-span-1 col-start-9 row-start-1' : 'col-span-1 row-start-1 col-start-3 min-h-18 md:min-h-24 md:row-start-1 md:col-start-5',
        ]"
        content-class="h-full !p-3"
      >
        <div class="flex h-full flex-col justify-between gap-1">
          <div class="flex items-start justify-between">
            <span class="text-xs font-medium tracking-wider text-muted-foreground">实时上行</span>
            <Icon
              icon="tabler:chevrons-up" :width="20" :height="20"
              class="text-slate-500/20 group-hover:text-slate-500 transition-colors"
            />
          </div>
          <Transition v-bind="metricSwitchTransitionProps">
            <div
              :key="`speed-up-${summaryTransitionKey}`" class="flex items-baseline gap-1"
              :style="getMetricSwitchStyle(4)"
            >
              <span class="text-md md:text-2xl font-bold leading-none tracking-tight">{{ formattedSpeedUp.value
              }}</span>
              <span class="text-[11px] md:text-xs font-medium text-muted-foreground">{{ formattedSpeedUp.unit }}</span>
            </div>
          </Transition>
        </div>
      </CardX>
      <CardX
        hoverable
        class="group h-full border-none rounded-md transition-all"
        :class="[
          pickSurfaceClass('bg-background/60 hover:bg-background', 'bg-background/50 hover:bg-background backdrop-blur-xs'),
          showVisualPanel ? 'col-span-4 row-span-1 col-start-9 row-start-2' : 'col-span-1 row-start-2 col-start-3 min-h-18 md:min-h-24 md:row-start-1 md:col-start-6',
        ]"
        content-class="h-full !p-3"
      >
        <div class="flex h-full flex-col justify-between gap-1">
          <div class="flex items-start justify-between">
            <span class="text-xs font-medium tracking-wider text-muted-foreground">实时下行</span>
            <Icon
              icon="tabler:chevrons-down" :width="20" :height="20"
              class="text-slate-500/20 group-hover:text-slate-500 transition-colors"
            />
          </div>
          <Transition v-bind="metricSwitchTransitionProps">
            <div
              :key="`speed-down-${summaryTransitionKey}`" class="flex items-baseline gap-1"
              :style="getMetricSwitchStyle(5)"
            >
              <span class="text-md md:text-2xl font-bold leading-none tracking-tight">
                {{ formattedSpeedDown.value }}
              </span>
              <span class="text-[11px] md:text-xs font-medium text-muted-foreground">{{ formattedSpeedDown.unit
              }}</span>
            </div>
          </Transition>
        </div>
      </CardX>
    </div>
  </div>
</template>

<style scoped>
.metric-switch-enter-active,
.metric-switch-leave-active {
  transition:
    opacity 160ms ease,
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 180ms ease;
}

.metric-switch-enter-active {
  transition-delay: var(--metric-switch-delay, 0ms);
}

.metric-switch-enter-from {
  opacity: 0;
  transform: translateY(6px);
  filter: blur(3px);
}

.metric-switch-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  filter: blur(2px);
}

@media (prefers-reduced-motion: reduce) {
  .metric-switch-enter-active,
  .metric-switch-leave-active {
    transition: none;
    transition-delay: 0ms;
  }

  .metric-switch-enter-from,
  .metric-switch-leave-to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
</style>
