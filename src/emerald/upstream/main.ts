import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { setupIconify } from '@emerald/utils/iconify'
import { message } from '@emerald/utils/message'
import App from './App.vue'
import router from './router'

import './styles/main.css'
import '../../scrollbars.css'
import '../host-theme.css'

window.$message = message

setupIconify().catch((err) => {
  console.warn('[main] iconify init failed', err)
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')
