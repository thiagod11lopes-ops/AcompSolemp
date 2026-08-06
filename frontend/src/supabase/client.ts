import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '@/config/env'

let client: SupabaseClient | null = null

/** Garante só a origem do projeto (sem /rest/v1 nem barra final). */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  try {
    const url = new URL(trimmed)
    // Se colaram a API URL com path (/rest/v1 etc.), remove o path.
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return trimmed.replace(/\/rest\/v1$/i, '').replace(/\/+$/, '')
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
    )
  }

  if (!client) {
    client = createClient(normalizeSupabaseUrl(env.supabase.url), env.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return client
}

export function isSupabaseClientReady(): boolean {
  return client !== null
}
