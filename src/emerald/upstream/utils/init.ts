import { useAppStore } from '@emerald/stores/app'
import { useNodesStore } from '@emerald/stores/nodes'
import { getPayload, subscribePayload, installHostBridge } from '../../bridge'
import { payloadToNodes } from '../../data-adapter'
import { createPublicSettingsCache } from '../../public-settings-cache'
import { loadSiteSettings } from '../../../site-settings'
let dispose: (() => void) | undefined
export async function initApp() {
  const app = useAppStore()
  const nodes = useNodesStore()
  const cachedPublicSettings = createPublicSettingsCache()
  let lastPublicSettings: ReturnType<typeof cachedPublicSettings> | undefined
  let loginEnabled = false
  let active = true
  let lastEarthSnapshot = 0
  const update = (payload: NonNullable<ReturnType<typeof getPayload>>, error?: string | null) => {
    const settings = cachedPublicSettings(payload, loginEnabled)
    if (lastPublicSettings !== settings) {
      app.publicSettings = settings
      lastPublicSettings = settings
    }
    nodes.nodes = payload.enabled ? payloadToNodes(payload) : []
    if (!lastEarthSnapshot || Date.now() - lastEarthSnapshot > 60000 || nodes.earthNodes.length !== nodes.nodes.length) {
      nodes.earthNodes = [...nodes.nodes]
      lastEarthSnapshot = Date.now()
    }
    nodes.updateWsState(error ? 'disconnected' : 'connected')
    app.connectionError = Boolean(error)
    app.loading = false
  }
  const unsubscribe = subscribePayload(update)
  const stopBridge = installHostBridge()
  dispose = () => { active = false; unsubscribe(); stopBridge() }
  const payload = getPayload()
  if (payload) update(payload)
  void loadSiteSettings().then(settings => { if (!active) return; loginEnabled = settings.master_login_enabled; const data = getPayload(); if (data) update(data) })
  window.parent.postMessage({ type: 'emerald-ready' }, window.location.origin)
}
export function destroyInitManager() { dispose?.(); dispose = undefined }
