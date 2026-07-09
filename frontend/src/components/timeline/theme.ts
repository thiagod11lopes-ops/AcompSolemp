import { premiumTokens } from '@/theme/tokens'

/** @deprecated use premiumTokens from @/theme/tokens */
export const timelineTheme = {
  bg: premiumTokens.bg,
  card: premiumTokens.card,
  border: premiumTokens.border,
  text: premiumTokens.text,
  textSecondary: premiumTokens.textSecondary,
  line: premiumTokens.line,
  blue: premiumTokens.primary,
  green: premiumTokens.green,
  orange: premiumTokens.orange,
  yellow: premiumTokens.yellow,
  red: premiumTokens.red,
  purple: premiumTokens.purple,
  radius: premiumTokens.radius,
  shadow: premiumTokens.shadow,
  glass: premiumTokens.glass,
} as const
