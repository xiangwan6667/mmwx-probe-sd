import type { MessageApi } from '@emerald/utils/message'

declare const __BUILD_VERSION__: string
declare const __BUILD_GIT_HASH__: string

declare global {
  interface Window {
    $message: MessageApi
  }
}

export {}
