import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback
  const message = error.response?.data?.message
  if (typeof message === 'string' && message) return message
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return '连接服务器超时，请稍后重试'
  if (!error.response || [502, 503, 504].includes(error.response.status)) return '无法连接服务，请稍后重试'
  if (error.response.status === 404) return '服务暂时不可用，请稍后重试'
  return fallback
}
