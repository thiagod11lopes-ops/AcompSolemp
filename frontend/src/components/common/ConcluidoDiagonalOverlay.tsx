import { Box, Typography } from '@mui/material'

interface ConcluidoDiagonalOverlayProps {
  label?: string
}

/** Faixa diagonal verde opaca — usada em cards de processo concluído */
export function ConcluidoDiagonalOverlay({ label = 'Concluído' }: ConcluidoDiagonalOverlayProps) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        borderRadius: 'inherit',
        zIndex: 2,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '220%',
          height: 44,
          transform: 'translate(-50%, -50%) rotate(-32deg)',
          bgcolor: '#166534',
          opacity: 0.94,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 14px rgba(0,0,0,0.28)',
        }}
      >
        <Typography
          component="span"
          sx={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  )
}
