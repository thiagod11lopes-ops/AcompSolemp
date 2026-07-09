/** Design tokens premium — base da timeline e do sistema */
export const premiumTokens = {
  bg: '#0B1220',
  bgElevated: '#0F172A',
  card: '#111827',
  cardHover: '#1A2234',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  line: '#334155',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  green: '#22C55E',
  yellow: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  radius: 16,
  radiusSm: 12,
  shadow: '0 8px 32px rgba(0,0,0,0.35)',
  shadowSm: '0 4px 20px rgba(0,0,0,0.25)',
  glass: 'rgba(17,24,39,0.72)',
  gradientBg:
    'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(59, 130, 246, 0.12), transparent), #0B1220',
  gradientAuth:
    'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(59, 130, 246, 0.18), transparent), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(139, 92, 246, 0.12), transparent), #0B1220',
} as const

/** Variante clara alinhada à identidade (acentos iguais) */
export const premiumLightTokens = {
  bg: '#F1F5F9',
  bgElevated: '#E2E8F0',
  card: '#FFFFFF',
  cardHover: '#F8FAFC',
  border: 'rgba(15,23,42,0.08)',
  borderStrong: 'rgba(15,23,42,0.14)',
  text: '#0F172A',
  textSecondary: '#64748B',
  line: '#CBD5E1',
} as const
