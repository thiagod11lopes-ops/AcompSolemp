import { useCallback, useEffect, useState } from 'react'
import { env, isSupabaseConfigured } from '@/config/env'

const POLL_MS = 4_000
const FETCH_TIMEOUT_MS = 3_500

async function pingUrl(url: string, init?: RequestInit): Promise<boolean> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      ...init,
    })
    // no-cors devolve opaque (status 0) — conta como alcançável
    if (init?.mode === 'no-cors') return true
    return res.status > 0 && res.status < 500
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

async function pingServer(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false
  }

  if (isSupabaseConfigured()) {
    const base = env.supabase.url.replace(/\/$/, '')
    const health = `${base}/auth/v1/health`
    const okCors = await pingUrl(health, {
      method: 'GET',
      headers: env.supabase.anonKey
        ? { apikey: env.supabase.anonKey }
        : undefined,
    })
    if (okCors) return true
    // Fallback: so testa se o host do servidor responde na rede local
    return pingUrl(base, { method: 'GET', mode: 'no-cors' })
  }

  return pingUrl(`${window.location.origin}/`, { method: 'HEAD' })
}

/**
 * true = rede/servidor acessiveis; false = fora do ar.
 * Nao ha modo offline: a UI deve bloquear quando retornar false.
 */
export function useServerReachable(): {
  reachable: boolean
  checking: boolean
  recheck: () => void
} {
  const [reachable, setReachable] = useState(true)
  const [checking, setChecking] = useState(true)

  const recheck = useCallback(() => {
    setChecking(true)
    void pingServer().then((ok) => {
      setReachable(ok)
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const ok = await pingServer()
      if (!cancelled) {
        setReachable(ok)
        setChecking(false)
      }
    }

    void run()
    const id = window.setInterval(() => {
      void run()
    }, POLL_MS)

    const onOnline = () => {
      void run()
    }
    const onOffline = () => {
      if (!cancelled) {
        setReachable(false)
        setChecking(false)
      }
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return { reachable, checking, recheck }
}
