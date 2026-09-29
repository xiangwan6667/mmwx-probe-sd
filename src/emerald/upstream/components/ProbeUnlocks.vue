<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { Icon } from '@iconify/vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import { Badge } from './ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { allUnlocked, serverUnlocks, unlockSections } from '../../../probe-unlocks'
import { getPayload, subscribePayload } from '../../bridge'
import { useBackgroundSurface } from '@emerald/composables/useBackgroundSurface'

const props = defineProps<{ uuid: string }>()
const open = ref(false)
const tab = ref('streaming')
const payload = shallowRef(getPayload())
const unsubscribe = subscribePayload(() => { payload.value = getPayload() })
onBeforeUnmount(unsubscribe)
const unlocks = computed(() => serverUnlocks(payload.value, props.uuid))
const sections = computed(() => unlockSections(unlocks.value))
const count = computed(() => sections.value.reduce((sum, section) => sum + section.count, 0))
const { pickSurfaceClass } = useBackgroundSurface()
function stopCardKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
  event.stopPropagation()
}
</script>

<template>
  <PopoverRoot v-if="unlocks.length" v-model:open="open">
    <PopoverTrigger as-child>
      <Badge as="button" type="button" variant="outline" class="emerald-unlocks-trigger cursor-pointer hover:bg-accent"
        :data-complete="allUnlocked(unlocks)"
        :aria-label="`解锁检测 ${count}/${unlocks.length}`" :title="`解锁检测 ${count}/${unlocks.length}`" @click.stop @keydown="stopCardKey">
        <Icon icon="lucide:lock-keyhole" />
      </Badge>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent align="start" :side-offset="6" :collision-padding="8" aria-label="解锁检测"
        class="emerald-unlocks-panel z-50 rounded-lg border bg-popover p-3 text-popover-foreground shadow-xl outline-none"
        :class="pickSurfaceClass('', 'bg-popover/90 backdrop-blur-sm')" @click.stop @keydown="stopCardKey">
        <div class="mb-3 flex items-center justify-between gap-2 text-sm font-semibold">
          <span>解锁检测</span><span className="text-muted-foreground font-normal">{{ count }}/{{ unlocks.length }}</span>
        </div>
        <Tabs v-model="tab" class="flex-col">
          <TabsList class="w-full">
            <TabsTrigger v-for="section in sections" :key="section.key" :value="section.key" class="text-xs">
              {{ section.zh }}<small>{{ section.count }}/{{ section.rows.length }}</small>
            </TabsTrigger>
          </TabsList>
          <div class="emerald-unlocks-panels">
          <TabsContent v-for="section in sections" :key="section.key" :value="section.key" force-mount
            class="emerald-unlocks-section" :style="{ visibility: tab === section.key ? 'visible' : 'hidden' }" :aria-hidden="tab !== section.key" :inert="tab !== section.key">
            <ul class="emerald-unlocks-list">
              <li v-for="row in section.rows" :key="row.key" :title="row.title">
                <svg v-if="row.meta.icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="row.meta.icon.path" /></svg>
                <span v-else class="emerald-unlocks-letter">{{ row.meta.short }}</span>
                <span class="min-w-0 flex-1 truncate">{{ row.meta.label }}</span>
                <span class="emerald-unlocks-status" :data-tone="row.tone"><span>{{ row.text }}</span>
                  <Icon v-if="row.tone !== 'info'" :icon="row.tone === 'ok' || row.tone === 'partial' ? 'lucide:lock-keyhole-open' : row.tone === 'muted' ? 'lucide:circle-help' : 'lucide:lock-keyhole'" aria-hidden="true" />
                </span>
              </li>
            </ul>
            <p v-if="!section.rows.length" class="py-3 text-center text-xs text-muted-foreground">暂无检测结果</p>
          </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style>
.emerald-unlocks-trigger { display: inline-flex; justify-content: center; align-items: center; width: 28px; height: 28px; padding: 0; flex: none; }
.emerald-unlocks-trigger svg { color: var(--color-emerald-700); }
.emerald-unlocks-trigger[data-complete="true"] svg { color: var(--color-amber-600); }
.dark .emerald-unlocks-trigger svg { color: var(--color-emerald-300); }
.dark .emerald-unlocks-trigger[data-complete="true"] svg { color: var(--color-amber-300); }
.emerald-unlocks-panels { display: grid; }
.emerald-unlocks-section { grid-area: 1 / 1; display: block; }
.emerald-unlocks-panel { width: min(340px, calc(100vw - 16px)); max-height: var(--reka-popover-content-available-height); overflow: auto; overscroll-behavior: contain; }
.emerald-unlocks-list { margin: 0; padding: 0; list-style: none; font-size: 12px; }
.emerald-unlocks-list li { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.emerald-unlocks-list svg { width: 15px; height: 15px; flex: none; }
.emerald-unlocks-letter { width: 20px; font-size: 9px; text-align: center; color: var(--muted-foreground); }
.emerald-unlocks-status { display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px; max-width: 55%; color: var(--muted-foreground); }
.emerald-unlocks-status > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.emerald-unlocks-status svg { width: 12px; height: 12px; }
.emerald-unlocks-status[data-tone="info"] { color: var(--foreground); }
.emerald-unlocks-status[data-tone="ok"] { color: var(--color-emerald-700); }
.emerald-unlocks-status[data-tone="partial"] { color: var(--color-amber-700); }
.emerald-unlocks-status[data-tone="banned"] { color: var(--color-red-700); }
.dark .emerald-unlocks-status[data-tone="ok"] { color: var(--color-emerald-300); }
.dark .emerald-unlocks-status[data-tone="partial"] { color: var(--color-amber-300); }
.dark .emerald-unlocks-status[data-tone="banned"] { color: var(--color-red-300); }
</style>
