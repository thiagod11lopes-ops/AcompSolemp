import { Box, Card, CardActionArea, CardContent, keyframes } from '@mui/material'
import { useEffect, useId, useMemo, useState } from 'react'
import { premiumTokens } from '@/theme/tokens'

interface ConcluidosCardProps {
  concluidos: number
  totalProcessos: number
  emAndamento: number
  valorConcluidos: number
  tempoMedioDias: number
  onClick?: () => void
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

/** Card Concluídos com gráfico de anéis concêntricos no estilo da referência. */
export function ConcluidosCard({
  concluidos,
  totalProcessos,
  emAndamento,
  tempoMedioDias,
  onClick,
}: ConcluidosCardProps) {
  const uid = useId().replace(/:/g, '')
  const shadowId = `concluidos-shadow-${uid}`
  const gOuter = `concluidos-g-outer-${uid}`
  const gMid = `concluidos-g-mid-${uid}`
  const gInner = `concluidos-g-inner-${uid}`
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimate(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const taxaConclusao = useMemo(() => {
    if (totalProcessos <= 0) return 0
    return (concluidos / totalProcessos) * 100
  }, [concluidos, totalProcessos])

  const taxaAndamento = useMemo(() => {
    if (totalProcessos <= 0) return 0
    return (emAndamento / totalProcessos) * 100
  }, [emAndamento, totalProcessos])

  /** Velocidade relativa: quanto menor o tempo médio, maior o arco (cap em 30 dias). */
  const taxaTempo = useMemo(() => {
    if (concluidos <= 0) return 0
    const dias = Math.max(1, tempoMedioDias)
    return clampPct((1 - Math.min(dias, 30) / 30) * 100)
  }, [concluidos, tempoMedioDias])

  const content = (
    <CardContent
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 1, sm: 1.25 },
        '&:last-child': { pb: { xs: 1, sm: 1.25 } },
        overflow: 'hidden',
      }}
    >
      <Box
        component="svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        sx={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
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
            <stop offset="0%" stopColor="#5CE1FF" />
            <stop offset="55%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id={gMid} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A3E635" />
            <stop offset="50%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor={premiumTokens.primary} />
          </linearGradient>
          <linearGradient id={gInner} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="45%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={96}
          fill="none"
          stroke="rgba(63, 107, 86, 0.1)"
          strokeWidth={14}
        />
        <circle
          cx={CX}
          cy={CY}
          r={74}
          fill="none"
          stroke="rgba(63, 107, 86, 0.08)"
          strokeWidth={15}
        />
        <circle
          cx={CX}
          cy={CY}
          r={50}
          fill="none"
          stroke="rgba(63, 107, 86, 0.07)"
          strokeWidth={16}
        />

        <RingArc
          radius={96}
          strokeWidth={14}
          percent={taxaConclusao}
          gradientId={gOuter}
          filterId={shadowId}
          startAngle={-110}
          animate={animate}
        />
        <RingArc
          radius={74}
          strokeWidth={15}
          percent={taxaAndamento > 0 ? taxaAndamento : taxaConclusao * 0.55}
          gradientId={gMid}
          filterId={shadowId}
          startAngle={20}
          animate={animate}
        />
        <RingArc
          radius={50}
          strokeWidth={16}
          percent={taxaTempo > 0 ? taxaTempo : Math.max(taxaConclusao * 0.7, 8)}
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
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {concluidos}
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
          aria-label={`Concluídos: ${concluidos} processos finalizados — ver detalhes`}
        >
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}
