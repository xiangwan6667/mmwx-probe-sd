<script setup lang="ts">
import { computed } from 'vue'
import VisitorInfoCard from '@emerald/components/VisitorInfoCard.vue'
import { useAppStore } from '@emerald/stores/app'

const appStore = useAppStore()
const showIcp = computed(() => appStore.icpEnabled && appStore.icpNumber)
const showPolice = computed(() => appStore.policeEnabled && appStore.policeNumber)
const showFiling = computed(() => showIcp.value || showPolice.value)
</script>

<template>
  <VisitorInfoCard v-if="appStore.visitorInfoCardEnabled" />
  <footer class="w-full sm:flex-row sm:gap-4 max-w-[1280px] mx-auto p-4">
    <div class="flex flex-row items-center justify-between  text-xs text-muted-foreground">
      <div class="flex gap-1 items-center">
        Powered by
        <a href="https://github.com/xiangwan6667/mmwx-probe-sd" target="_blank" rel="noopener noreferrer" class="transition-opacity hover:opacity-80">
          <span class="font-medium text-foreground">MMWX Probe</span>
        </a>
      </div>
      <div class="flex flex-wrap gap-1 items-center">
        Theme by
        <a href="https://github.com/Tokinx/komari-theme-emerald" target="_blank" rel="noopener noreferrer" class="transition-opacity hover:opacity-80">
          <span class="font-medium text-foreground">Komari Emerald</span>
        </a>
      </div>
    </div>

    <div v-if="showFiling" class="flex flex-wrap gap-2 items-center justify-center sm:flex-shrink-0 pb-7">
      <a
        v-if="showIcp" :href="appStore.icpUrl" target="_blank" rel="noopener noreferrer"
        class="transition-opacity hover:opacity-70"
      >
        <span class="text-xs text-muted-foreground">{{ appStore.icpNumber || '' }}</span>
      </a>
      <span v-if="showIcp && showPolice" class="opacity-50 text-xs text-muted-foreground">·</span>
      <template v-if="showPolice">
        <a
          v-if="appStore.policeUrl" :href="appStore.policeUrl" target="_blank" rel="noopener noreferrer"
          class="transition-opacity hover:opacity-70"
        >
          <span class="text-xs text-muted-foreground">{{ appStore.policeNumber || '' }}</span>
        </a>
        <span v-else class="text-xs text-muted-foreground">{{ appStore.policeNumber || '' }}</span>
      </template>
    </div>
  </footer>
</template>
