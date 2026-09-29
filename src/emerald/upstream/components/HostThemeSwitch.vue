<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { createRoot, type Root } from 'react-dom/client'
import { createElement } from 'react'
import { ThemeSwitch } from '../../../ThemeSwitch'
import { getPayload, subscribePayload } from '../../bridge'
const element = ref<HTMLElement>()
let root: Root | undefined
let unsubscribe: (() => void) | undefined
onMounted(() => {
  root = createRoot(element.value!)
  const render = () => root?.render(createElement(ThemeSwitch, { appearance: getPayload()?.appearance }))
  unsubscribe = subscribePayload(render)
  render()
})
onBeforeUnmount(() => { unsubscribe?.(); root?.unmount() })
</script>
<template><div ref="element" class="emerald-theme-switch" /></template>
<style>
.emerald-theme-switch .probe-theme-switch { width: 32px; height: 32px; min-height: 32px; border: 0; border-radius: 8px; background: transparent; color: var(--foreground); box-shadow: none; }
.probe-theme-dropdown {
  --menu-surface: var(--popover);
  --menu-border: var(--border);
  --menu-accent: var(--primary);
  --menu-muted: var(--muted-foreground);
  color: var(--popover-foreground);
}
</style>
