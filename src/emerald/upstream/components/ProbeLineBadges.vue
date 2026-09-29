<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { Badge } from './ui/badge'
import { cardRouteLines } from '../../../probe-route-lines'
import { getPayload, subscribePayload } from '../../bridge'

const props = defineProps<{ uuid: string }>()
const payload = shallowRef(getPayload())
const unsubscribe = subscribePayload(() => { payload.value = getPayload() })
onBeforeUnmount(unsubscribe)
const lines = computed(() => payload.value ? cardRouteLines(payload.value, props.uuid) : [])
</script>

<template>
  <div v-if="lines.length" class="flex flex-wrap items-center gap-1.5" aria-label="三网回程线路">
    <Badge v-for="line in lines" :key="line.key" variant="outline"
      class="h-auto! gap-1.5! px-1.5! py-1! text-[11px]! border-muted-foreground/20 text-muted-foreground"
      :title="[`${line.name}回程`, line.route, line.region, line.testedAt && `探测时间 ${line.testedAt}`].filter(Boolean).join(' · ')">
      <span>{{ line.name }}</span><strong class="text-foreground font-semibold">{{ line.route }}</strong>
    </Badge>
  </div>
</template>
