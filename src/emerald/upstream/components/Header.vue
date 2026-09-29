<script setup lang="ts">
import HostThemeSwitch from './HostThemeSwitch.vue'
import { Icon } from '@iconify/vue'
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Avatar, AvatarFallback, AvatarImage } from '@emerald/components/ui/avatar'
import { Button } from '@emerald/components/ui/button'
import { DataTooltip } from '@emerald/components/ui/data-tooltip'
import { useAppStore } from '@emerald/stores/app'

const router = useRouter()
const appStore = useAppStore()

const isScrolled = inject<ReturnType<typeof ref<boolean>>>('isScrolled', ref(false))

const siteFavicon = computed(() => appStore.publicSettings?.theme_settings?.siteIcon as string || '')

const actionButtons = computed(() => {
  const buttons: { title: string, icon: string, action: string }[] = []

  if (appStore.isLoggedIn || !appStore.hideAdminEntryWhenLoggedOut) {
    buttons.push({
      title: '后台管理',
      icon: 'icon-park-outline:setting',
      action: 'jumpToSetting',
    })
  }
  return buttons
})

function handleButtonClick(action: string) {
  switch (action) {
    case 'toggleTheme':
      appStore.updateThemeMode()
      break
    case 'jumpToSetting':
      window.top!.location.href = '/login'
      break
  }
}

const sitename = computed(() => appStore.publicSettings?.sitename || 'MMWX Probe')
</script>

<template>
  <div
    class="transition-all duration-200 top-0 sticky z-10 border-b border-transparent"
    :class="isScrolled ? 'backdrop-blur-xl' : 'bg-transparent'"
  >
    <div class="px-4 flex-between h-14 max-w-[1280px] mx-auto">
      <div class="flex items-center gap-3 cursor-pointer" @click="router.push('/')">
        <Avatar class="size-8">
          <AvatarImage :src="siteFavicon" :alt="sitename" />
          <AvatarFallback>{{ sitename.slice(0, 1) }}</AvatarFallback>
        </Avatar>
        <h3 class="m-0 text-lg font-semibold">
          {{ sitename }}
        </h3>
      </div>
      <div class="flex items-center gap-2">
        <HostThemeSwitch />
        <DataTooltip v-for="button in actionButtons" :key="button.action" :content="button.title" placement="left" content-class="whitespace-nowrap text-[11px] px-2">
          <Button variant="ghost" size="icon-sm" @click="handleButtonClick(button.action)">
            <Icon :icon="button.icon" :width="18" :height="18" />
          </Button>
        </DataTooltip>
      </div>
    </div>
  </div>
</template>
