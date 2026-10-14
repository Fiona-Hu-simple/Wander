import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { redirectToLogin } from '@/stores/session'
const request = axios.create({ baseURL: API_BASE_URL, timeout: 10000 })
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token && !config.url?.startsWith('/auth/')) config.headers.Authorization = 'Bearer ' + token
  return config
})
request.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) redirectToLogin()
  return Promise.reject(error)
})
export default request
