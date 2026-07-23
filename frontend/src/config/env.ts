export type DataSource = 'local' | 'supabase'

function readDataSource(): DataSource {
  const value = import.meta.env.VITE_DATA_SOURCE
  return value === 'supabase' ? 'supabase' : 'local'
}

export const env = {
  dataSource: readDataSource(),
  isSupabase: readDataSource() === 'supabase',
  /** E-mail opcional do gestor no bootstrap local (deve ser @marinha.mil.br) */
  gestorGoogleEmail: (import.meta.env.VITE_GESTOR_GOOGLE_EMAIL ?? '').trim().toLowerCase(),
  supabase: {
    url: (import.meta.env.VITE_SUPABASE_URL ?? '').trim(),
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
  },
} as const

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabase.url && env.supabase.anonKey)
}
