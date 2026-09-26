/**
 * Design tokens — aparência inspirada no Raycast (leve, clara, tipografia forte).
 * Acentos e superfícies só; não altera fluxos do sistema.
 */
export const premiumTokens = {
  bg: '#0C0C0D',
  bgElevated: '#141415',
  card: '#1C1C1E',
  cardHover: '#2C2C2E',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#F5F5F7',
  textSecondary: '#A1A1A6',
  line: '#3A3A3C',
  /** Coral Raycast */
  primary: '#FF6363',
  primaryLight: '#FF8A8A',
  primaryDark: '#E5484D',
  green: '#30D158',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  red: '#FF453A',
  purple: '#BF5AF2',
  radius: 14,
  radiusSm: 10,
  shadow: '0 12px 40px rgba(0,0,0,0.45)',
  shadowSm: '0 4px 16px rgba(0,0,0,0.28)',
  glass: 'rgba(28,28,30,0.78)',
  gradientBg:
    'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(255, 99, 99, 0.12), transparent 55%), #0C0C0D',
  gradientAuth:
    'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(255, 99, 99, 0.16), transparent), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(255, 159, 10, 0.08), transparent), #F5F5F7',
} as const

/** Tema claro — base Raycast (branco suave, tipografia escura, acento coral) */
export const premiumLightTokens = {
  bg: '#F5F5F7',
  bgElevated: '#EBEBF0',
  card: '#FFFFFF',
  cardHover: '#FAFAFA',
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.12)',
  text: '#1D1D1F',
  textSecondary: '#6E6E73',
  line: '#D2D2D7',
} as const
