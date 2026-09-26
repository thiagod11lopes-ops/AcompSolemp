import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material'
import { useId, useMemo } from 'react'
import { formatCurrency } from '@/utils/format'

interface ConcluidosCardProps {
  concluidos: number
  totalProcessos: number
  emAndamento: number
  valorConcluidos: number
  tempoMedioDias: number
  onClick?: () => void
}

const SIZE = 220
const CX = SIZE / 2
const CY = SIZE / 2

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
}: {
  radius: number
  strokeWidth: number
  percent: number
  gradientId: string
  filterId: string
  startAngle?: number
}) {
  const circumference = 2 * Math.PI * radius
  const pct = clampPct(percent)
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
      style={{ transition: 'stroke-dasharray 0.6s ease' }}
    />
  )
}

function Callout({
  x,
  y,
  anchorX,
  anchorY,
  color,
  title,
  detail,
  align = 'left',
}: {
  x: number
  y: number
  anchorX: number
  anchorY: number
  color: string
  title: string
  detail: string
  align?: 'left' | 'right'
}) {
  return (
    <g>
      <line
        x1={anchorX}
        y1={anchorY}
        x2={x}
        y2={y}
        stroke={color}
        strokeWidth={1.25}
        opacity={0.85}
      />
      <circle cx={anchorX} cy={anchorY} r={3.5} fill={color} />
      <circle cx={anchorX} cy={anchorY} r={6} fill={color} opacity={0.22} />
      <foreignObject
        x={align === 'right' ? x - 108 : x}
        y={y - 18}
        width={110}
        height={40}
      >
        <Box
          sx={{
            textAlign: align === 'right' ? 'right' : 'left',
            lineHeight: 1.15,
            pointerEvents: 'none',
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'block',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.68rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Box>
          <Box
            component="span"
            sx={{
              display: 'block',
              color: 'rgba(255,255,255,0.72)',
              fontSize: '0.62rem',
              fontWeight: 500,
              mt: 0.15,
            }}
          >
            {detail}
          </Box>
        </Box>
      </foreignObject>
    </g>
  )
}

/** Card Concluídos com gráfico de anéis concêntricos no estilo da referência. */
export function ConcluidosCard({
  concluidos,
  totalProcessos,
  emAndamento,
  valorConcluidos,
  tempoMedioDias,
  onClick,
}: ConcluidosCardProps) {
  const uid = useId().replace(/:/g, '')
  const shadowId = `concluidos-shadow-${uid}`
  const gOuter = `concluidos-g-outer-${uid}`
  const gMid = `concluidos-g-mid-${uid}`
  const gInner = `concluidos-g-inner-${uid}`

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
        flexDirection: 'column',
        gap: 1,
        p: { xs: 1.5, sm: 1.75 },
        '&:last-child': { pb: { xs: 1.5, sm: 1.75 } },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography
          sx={{
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          Concluídos
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.02em',
          }}
        >
          {formatCurrency(valorConcluidos)}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 210,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Box
          component="svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          sx={{
            width: '100%',
            maxWidth: 250,
            height: 'auto',
            overflow: 'visible',
          }}
        >
          <defs>
            <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000" floodOpacity="0.35" />
            </filter>
            <linearGradient id={gOuter} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5CE1FF" />
              <stop offset="55%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id={gMid} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A3E635" />
              <stop offset="50%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="#558B71" />
            </linearGradient>
            <linearGradient id={gInner} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="45%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
          </defs>

          {/* Trilhos sutis */}
          <circle cx={CX} cy={CY} r={88} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
          <circle cx={CX} cy={CY} r={68} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={14} />
          <circle cx={CX} cy={CY} r={46} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={16} />

          <RingArc
            radius={88}
            strokeWidth={12}
            percent={taxaConclusao}
            gradientId={gOuter}
            filterId={shadowId}
            startAngle={-110}
          />
          <RingArc
            radius={68}
            strokeWidth={14}
            percent={taxaAndamento > 0 ? taxaAndamento : taxaConclusao * 0.55}
            gradientId={gMid}
            filterId={shadowId}
            startAngle={20}
          />
          <RingArc
            radius={46}
            strokeWidth={16}
            percent={taxaTempo > 0 ? taxaTempo : Math.max(taxaConclusao * 0.7, 8)}
            gradientId={gInner}
            filterId={shadowId}
            startAngle={-200}
          />

          <Callout
            align="right"
            x={18}
            y={36}
            anchorX={CX - 62}
            anchorY={CY - 48}
            color="#5CE1FF"
            title="Concluídos"
            detail={`${concluidos} · ${taxaConclusao.toFixed(0)}%`}
          />
          <Callout
            align="left"
            x={SIZE - 18}
            y={48}
            anchorX={CX + 58}
            anchorY={CY - 36}
            color="#A3E635"
            title="Em andamento"
            detail={`${emAndamento} PED${emAndamento === 1 ? '' : 's'}`}
          />
          <Callout
            align="left"
            x={SIZE - 14}
            y={SIZE - 42}
            anchorX={CX + 40}
            anchorY={CY + 28}
            color="#C084FC"
            title="Tempo médio"
            detail={`${tempoMedioDias}d até concluir`}
          />

          <text
            x={CX}
            y={CY - 4}
            textAnchor="middle"
            fill="#FFFFFF"
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '0.04em',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {concluidos}
          </text>
          <text
            x={CX}
            y={CY + 16}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            FINALIZADOS
          </text>
        </Box>
      </Box>

      {onClick ? (
        <Typography
          sx={{
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        >
          Clique para ver a lista completa
        </Typography>
      ) : null}
    </CardContent>
  )

  return (
    <Card
      sx={{
        height: '100%',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 3,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 35%, rgba(99, 102, 241, 0.22), transparent 55%),
          radial-gradient(ellipse 70% 50% at 80% 90%, rgba(85, 139, 113, 0.18), transparent 50%),
          linear-gradient(165deg, #1a1830 0%, #12101f 45%, #0c0b14 100%)
        `,
        boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        overflow: 'hidden',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: '0 22px 48px rgba(0,0,0,0.45)',
            }
          : undefined,
      }}
    >
      {onClick ? (
        <CardActionArea
          onClick={onClick}
          sx={{ height: '100%', alignItems: 'stretch' }}
          aria-label="Concluídos — ver detalhes dos processos finalizados"
        >
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}
