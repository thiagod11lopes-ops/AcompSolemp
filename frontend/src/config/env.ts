export type DataSource = 'local' | 'supabase'

function readDataSource(): DataSource {
  const value = import.meta.env.VITE_DATA_SOURCE
  return value === 'supabase' ? 'supabase' : 'local'
}

export const env = {
  dataSource: readDataSource(),
  isSupabase: readDataSource() === 'supabase',
  /** E-mail opcional do gestor no bootstrap local */
  gestorGoogleEmail: (import.meta.env.VITE_GESTOR_GOOGLE_EMAIL ?? '').trim().toLowerCase(),
  /** Domínio institucional exigido nos logins/cadastros (ex.: definido no deploy). */
  emailDomain: (import.meta.env.VITE_EMAIL_DOMAIN ?? '').trim().toLowerCase(),
  /** E-mail do super administrador (definido no deploy). */
  superAdminEmail: (import.meta.env.VITE_SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase(),
  /** Nome da instituição em PDFs/planilhas (opcional). */
  instituicaoNome: (import.meta.env.VITE_INSTITUICAO_NOME ?? '').trim(),
  /** Nome do órgão em planilhas de materiais (opcional). */
  orgaoNome: (import.meta.env.VITE_ORGAO_NOME ?? '').trim(),
  supabase: {
    url: (import.meta.env.VITE_SUPABASE_URL ?? '').trim(),
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
  },
} as const

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabase.url && env.supabase.anonKey)
}
