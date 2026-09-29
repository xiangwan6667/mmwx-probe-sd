import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@emerald/views/HomeView.vue'),
    },
    {
      path: '/instance/:id',
      name: 'instance-detail',
      component: () => import('@emerald/views/InstanceDetail.vue'),
    },
  ],
})

router.afterEach((to) => {
  const hash = to.name === 'instance-detail' && /^\d+$/.test(String(to.params.id)) ? `#/server/${to.params.id}` : '#/'
  window.parent.postMessage({ type: 'emerald-route', hash }, window.location.origin)
})
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'mmwx-probe-route') return
  const match = /^#\/server\/(\d+)$/.exec(event.data.hash)
  void router.replace(match ? `/instance/${match[1]}` : '/')
})
export default router
