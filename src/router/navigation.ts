import { ref } from 'vue'
import type { Router } from 'vue-router'

export const navigationError = ref('')

export function installRouteRecovery(router: Router) {
  router.onError((error, to) => {
    if (!/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|error loading dynamically imported module/i.test(error.message)) {
      navigationError.value = '页面打开失败，请刷新后重试'
      return
    }
    const key = `wander-route-reload:${to.fullPath}`
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.replace(router.resolve(to.fullPath).href)
        return
      }
    } catch { /* 浏览器禁止存储时不自动循环刷新。 */ }
    navigationError.value = '页面资源未能加载，请检查连接后刷新重试'
  })
  router.afterEach((to, _from, failure) => {
    if (failure) return
    navigationError.value = ''
    try { sessionStorage.removeItem(`wander-route-reload:${to.fullPath}`) } catch { /* 无需持久化。 */ }
  })
}
