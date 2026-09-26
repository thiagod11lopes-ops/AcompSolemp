import { Box, Card, CardActionArea, CardContent, Typography, keyframes } from '@mui/material'
import { useEffect, useId, useState } from 'react'
import { premiumTokens } from '@/theme/tokens'

export type RingPalette = 'brand' | 'alert' | 'warning' | 'info' | 'success'

export interface DashboardRingCardProps {
  title: string
  value: string | number
  /** Três percentuais (0–100) para os anéis externo, médio e interno. */
  rings: [number, number, number]
  onClick?: () => void
  palette?: RingPalette
  ariaLabel?: string
  /** Altura mínima do gráfico (cards da grade superior). */
  chartMinHeight?: number
}

const SIZE = 240
const CX = SIZE / 2
const CY = SIZE / 2

const chartEnter = keyframes`
  from {
    opacity: 0;
    transform: scale(0.88);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`

const PALETTES: Record<
  RingPalette,
  { outer: [string, string, string]; mid: [string, string, string]; inner: [string, string, string] }
> = {
  brand: {
    outer: ['#5CE1FF', '#3B82F6', '#2563EB'],
    mid: ['#A3E635', '#4ADE80', premiumTokens.primary],
    inner: ['#60A5FA', '#818CF8', '#C084FC'],
  },
  alert: {
    outer: ['#FF8A80', '#FF453A', '#D70015'],
    mid: ['#FFB4A8', '#FF6B5A', '#E5484D'],
    inner: ['#FFCC80', '#FF9F0A', '#FF453A'],
  },
  warning: {
    outer: ['#FFD60A', '#FF9F0A', '#C93400'],
    mid: ['#FFE08A', '#FFB340', '#FF9F0A'],
    inner: ['#A3E635', '#7AA892', premiumTokens.primary],
  },
  info: {
    outer: ['#C084FC', '#A78BFA', '#7C3AED'],
    mid: ['#93C5FD', '#60A5FA', '#3B82F6'],
    inner: ['#F0ABFC', '#E879F9', '#BF5AF2'],
  },
  success: {
    outer: ['#86EFAC', '#4ADE80', premiumTokens.primary],
    mid: ['#5CE1FF', '#34D399', '#248A3D'],
    inner: ['#A3E635', '#7AA892', premiumTokens.primaryDark],
  },
}

function clampPct(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(100, Math.max(2, value))
}

function RingArc({
  radius,
  strokeWidth,
  percent,
  gradientId,
  filterId,
  startAngle = -90,
  animate,
}: {
  radius: number
  strokeWidth: number
  percent: number
  gradientId: string
  filterId: string
  startAngle?: number
  animate: boolean
}) {
  const circumference = 2 * Math.PI * radius
  const pct = animate ? clampPct(percent) : 0
  const dash = (pct / 100) * circumference

  return (
    <circle
      cx={CX}
      cy={CY}
      r={radius}
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${dash} ${circumference}`}
      transform={`rotate(${startAngle} ${CX} ${CY})`}
      filter={`url(#${filterId})`}
      style={{
        transition: 'stroke-dasharray 1.15s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    />
  )
}

function valueFontSize(value: string | number): number {
  const text = String(value)
  if (text.length > 14) return 16
  if (text.length > 10) return 20
  if (text.length > 6) return 26
  return 36
}

/** Card de KPI com anéis concêntricos — mesmo padrão visual de Processos Concluídos. */
export function DashboardRingCard({
  title,
  value,
  rings,
  onClick,
  palette = 'brand',
  ariaLabel,
  chartMinHeight = 140,
}: DashboardRingCardProps) {
  const uid = useId().replace(/:/g, '')
  const shadowId = `ring-shadow-${uid}`
  const gOuter = `ring-g-outer-${uid}`
  const gMid = `ring-g-mid-${uid}`
  const gInner = `ring-g-inner-${uid}`
  const [animate, setAnimate] = useState(false)
  const colors = PALETTES[palette]
  const [outer, mid, inner] = rings

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const content = (
    <CardContent
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1.25, sm: 1.5 },
        '&:last-child': { pb: { xs: 1.25, sm: 1.5 } },
        overflow: 'hidden',
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.95rem',
          letterSpacing: '-0.03em',
          lineHeight: 1.2,
          color: premiumTokens.primaryDark,
          textShadow: '0 1px 2px rgba(0,0,0,0.08)',
          flexShrink: 0,
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      <Box
        component="svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        sx={{
          width: '100%',
          flex: 1,
          minHeight: chartMinHeight,
          maxWidth: '100%',
          display: 'block',
          overflow: 'visible',
          animation: `${chartEnter} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both`,
        }}
      >
        <defs>
          <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#3F6B56" floodOpacity="0.28" />
          </filter>
          <linearGradient id={gOuter} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.outer[0]} />
            <stop offset="55%" stopColor={colors.outer[1]} />
            <stop offset="100%" stopColor={colors.outer[2]} />
          </linearGradient>
          <linearGradient id={gMid} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.mid[0]} />
            <stop offset="50%" stopColor={colors.mid[1]} />
            <stop offset="100%" stopColor={colors.mid[2]} />
          </linearGradient>
          <linearGradient id={gInner} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.inner[0]} />
            <stop offset="45%" stopColor={colors.inner[1]} />
            <stop offset="100%" stopColor={colors.inner[2]} />
          </linearGradient>
        </defs>

        <circle cx={CX} cy={CY} r={96} fill="none" stroke="rgba(63, 107, 86, 0.1)" strokeWidth={14} />
        <circle cx={CX} cy={CY} r={74} fill="none" stroke="rgba(63, 107, 86, 0.08)" strokeWidth={15} />
        <circle cx={CX} cy={CY} r={50} fill="none" stroke="rgba(63, 107, 86, 0.07)" strokeWidth={16} />

        <RingArc
          radius={96}
          strokeWidth={14}
          percent={outer}
          gradientId={gOuter}
          filterId={shadowId}
          startAngle={-110}
          animate={animate}
        />
        <RingArc
          radius={74}
          strokeWidth={15}
          percent={mid}
          gradientId={gMid}
          filterId={shadowId}
          startAngle={20}
          animate={animate}
        />
        <RingArc
          radius={50}
          strokeWidth={16}
          percent={inner}
          gradientId={gInner}
          filterId={shadowId}
          startAngle={-200}
          animate={animate}
        />

        <text
          x={CX}
          y={CY + 8}
          textAnchor="middle"
          fill={premiumTokens.primaryDark}
          style={{
            fontSize: valueFontSize(value),
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {value}
        </text>
      </Box>
    </CardContent>
  )

  return (
    <Card
      sx={{
        height: '100%',
        border: `1px solid ${premiumTokens.primary}33`,
        borderRadius: 3,
        background: `linear-gradient(165deg, #FFFFFF 0%, #F3F8F5 38%, ${premiumTokens.primaryLight}55 72%, ${premiumTokens.primary} 100%)`,
        boxShadow: '0 10px 28px rgba(63, 107, 86, 0.14)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        overflow: 'hidden',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: '0 16px 36px rgba(63, 107, 86, 0.22)',
            }
          : undefined,
      }}
    >
      {onClick ? (
        <CardActionArea
          onClick={onClick}
          sx={{ height: '100%', alignItems: 'stretch' }}
          aria-label={ariaLabel ?? `${title} — ver detalhes`}
        >
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}

/** Percentual seguro 0–100. */
export function ringPct(part: number, total: number): number {
  if (!total || total <= 0 || !Number.isFinite(part)) return 0
  return Math.min(100, Math.max(0, (part / total) * 100))
}

/** Escala um valor numérico em arco visual (útil quando não há denominador óbvio). */
export function ringScale(value: number, cap: number): number {
  if (!cap || cap <= 0 || !Number.isFinite(value) || value <= 0) return 0
  return Math.min(100, Math.max(2, (value / cap) * 100))
}
