import { Box, Typography } from '@mui/material'

interface ConcluidoDiagonalOverlayProps {
  label?: string
}

/** Faixa verde opaca na lateral direita do card — do topo à base */
export function ConcluidoDiagonalOverlay({ label = 'Concluído' }: ConcluidoDiagonalOverlayProps) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 40,
        pointerEvents: 'none',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#14532d',
        borderTopRightRadius: 'inherit',
        borderBottomRightRadius: 'inherit',
        boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.12)',
      }}
    >
      <Typography
        component="span"
        sx={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.65rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}
