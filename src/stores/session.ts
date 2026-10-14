import { ref } from 'vue'
import type { AuthSession } from '@/types/auth'

export const sessionUserId = ref(localStorage.getItem('userId') || '')
export const sessionUsername = ref(localStorage.getItem('username') || '')
let verifiedToken = ''
let verifiedUntil = 0

export function isSessionVerified(token: string) {
  return token === verifiedToken && Date.now() < verifiedUntil
}

export function clearSession() {
  verifiedToken = ''
  verifiedUntil = 0
  for (const key of ['token', 'userId', 'username']) localStorage.removeItem(key)
  sessionUserId.value = ''
  sessionUsername.value = ''
}

export function saveSession(data: AuthSession) {
  if (typeof data.token !== 'string' || !data.token || !Number.isSafeInteger(data.userId) || data.userId <= 0 || typeof data.username !== 'string') {
    throw new Error('服务器返回了无效的登录信息')
  }
  localStorage.setItem('token', data.token)
  localStorage.setItem('userId', String(data.userId))
  localStorage.setItem('username', data.username)
  sessionUserId.value = String(data.userId)
  sessionUsername.value = data.username
  // 仅缓存本次运行中后端已验证的会话，不信任 localStorage 自带的状态。
  verifiedToken = data.token
  try {
    const payload = JSON.parse(atob(data.token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')))
    verifiedUntil = typeof payload.exp === 'number' ? Math.min(Date.now() + 60000, payload.exp * 1000) : 0
  } catch {
    verifiedUntil = 0
  }
}

export function redirectToLogin() {
  clearSession()
  const url = new URL(`${import.meta.env.BASE_URL}login`, window.location.origin)
  url.searchParams.set('redirect', window.location.pathname.replace(import.meta.env.BASE_URL, '/') + window.location.search)
  window.location.replace(url)
}
