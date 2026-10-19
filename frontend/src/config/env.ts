export type DataSource = 'local' | 'supabase'

/** Injetado em runtime por `public/server-config.js` (servidor portátil). */
type RuntimeServerConfig = {
  dataSource?: DataSource
  supabaseUrl?: string
  supabaseAnonKey?: string
}

function runtimeConfig(): RuntimeServerConfig {
  if (typeof window === 'undefined') return {}
  const w = window as Window & { __ACOMP_SERVER__?: RuntimeServerConfig }
  return w.__ACOMP_SERVER__ ?? {}
}

function readDataSource(): DataSource {
  const fromRuntime = runtimeConfig().dataSource
  if (fromRuntime === 'supabase' || fromRuntime === 'local') return fromRuntime
  const value = import.meta.env.VITE_DATA_SOURCE
  return value === 'supabase' ? 'supabase' : 'local'
}

function readSupabaseUrl(): string {
  return (runtimeConfig().supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '').trim()
}

function readSupabaseAnonKey(): string {
  return (runtimeConfig().supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
}

export const env = {
  dataSource: readDataSource(),
  isSupabase: readDataSource() === 'supabase',
  /** E-mail opcional do gestor no bootstrap local (deve ser @marinha.mil.br) */
  gestorGoogleEmail: (import.meta.env.VITE_GESTOR_GOOGLE_EMAIL ?? '').trim().toLowerCase(),
  supabase: {
    url: readSupabaseUrl(),
    anonKey: readSupabaseAnonKey(),
  },
} as const

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabase.url && env.supabase.anonKey)
}
