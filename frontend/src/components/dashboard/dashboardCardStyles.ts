import { premiumTokens } from '@/theme/tokens'

/** Fundo em degradê branco → verde institucional (card Processos Concluídos). */
export const dashboardCardShellSx = {
  height: '100%',
  border: `1px solid ${premiumTokens.primary}33`,
  borderRadius: 3,
  background: `linear-gradient(165deg, #FFFFFF 0%, #F3F8F5 38%, ${premiumTokens.primaryLight}55 72%, ${premiumTokens.primary} 100%)`,
  boxShadow: '0 10px 28px rgba(63, 107, 86, 0.14)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 16px 36px rgba(63, 107, 86, 0.22)',
  },
} as const

/** Título no canto superior — mesmo padrão tipográfico do card Processos Concluídos. */
export const dashboardCardTitleSx = {
  fontWeight: 800,
  fontSize: '0.95rem',
  letterSpacing: '-0.03em',
  lineHeight: 1.2,
  color: premiumTokens.primaryDark,
  textShadow: '0 1px 2px rgba(0,0,0,0.08)',
} as const

/** Ícone do card — deslocado 25% para cima (10% + 15%). */
export const dashboardCardIconOffsetSx = {
  transform: 'translateY(-25%)',
} as const
