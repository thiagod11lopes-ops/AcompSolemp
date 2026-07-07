import { useEffect, useState } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'

interface SenhaMascaradaProps {
  senha: string | null
}

export function SenhaMascarada({ senha }: SenhaMascaradaProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!visible) return
    const hide = () => setVisible(false)
    window.addEventListener('mouseup', hide)
    return () => window.removeEventListener('mouseup', hide)
  }, [visible])

  if (!senha) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
      <Typography
        variant="body2"
        component="span"
        sx={{
          fontFamily: 'monospace',
          letterSpacing: visible ? 0 : 1,
          userSelect: visible ? 'text' : 'none',
        }}
      >
        {visible ? senha : '•'.repeat(Math.min(senha.length, 10))}
      </Typography>
      <IconButton
        size="small"
        aria-label="Pressione para ver a senha"
        sx={{ p: 0.5 }}
        onMouseDown={(event) => {
          if (event.button === 0) {
            event.preventDefault()
            setVisible(true)
          }
        }}
        onMouseUp={() => setVisible(false)}
        onMouseLeave={() => setVisible(false)}
      >
        <VisibilityOutlinedIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}
