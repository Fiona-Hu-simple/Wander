import type { Router } from 'vue-router'
import { API_BASE_URL } from '@/config/api'
import { clearSession, saveSession, isSessionVerified } from '@/stores/session'

export function installAuthGuard(router: Router) {
  router.beforeEach(async (to) => {
    if (!to.meta.requiresAuth) return
    const token = localStorage.getItem('token')
    const login = { path: '/login', query: { redirect: to.fullPath } }
    if (!token) {
      clearSession()
      return login
    }
    if (isSessionVerified(token)) return
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      })
      if (response.status === 401) {
        clearSession()
        return login
      }
      if (!response.ok) throw new Error('无法验证登录状态')
      const { data } = await response.json()
      saveSession({ token, ...data })
    } catch {
      return { path: '/login', query: { redirect: to.fullPath, error: 'verification' } }
    }
  })
}
