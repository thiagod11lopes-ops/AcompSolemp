import axios from 'axios'
import type { AuthUser } from '@/types'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('acomp_solemp_auth')
  if (stored) {
    const user = JSON.parse(stored) as AuthUser
    config.headers.Authorization = `Bearer ${user.token}`
  }
  return config
})

export function simulateNetworkError(rate = 0): never | void {
  if (Math.random() < rate) {
    throw new Error('Erro simulado de rede')
  }
}
