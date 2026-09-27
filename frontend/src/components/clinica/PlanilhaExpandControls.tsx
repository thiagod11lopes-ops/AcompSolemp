import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded'
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded'
import { IconButton, type SxProps, type Theme } from '@mui/material'
import { useEffect, useState } from 'react'

/** Estado + bloqueio de scroll do body para planilha em tela cheia. */
export function usePlanilhaExpand() {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  return { expanded, setExpanded }
}

/** Estilos do Paper da planilha quando expandida sobre a página. */
export function planilhaExpandedPaperSx(expanded: boolean): SxProps<Theme> {
  if (!expanded) return {}
  return {
    position: 'fixed',
    inset: 0,
    zIndex: (t) => t.zIndex.modal + 2,
    borderRadius: 0,
    m: 0,
    maxHeight: '100vh',
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 'none',
  }
}

interface PlanilhaExpandButtonProps {
  expanded: boolean
  onToggle: () => void
  labelExpand?: string
  labelCollapse?: string
}

/** Ícone à esquerda da lixeira: expandir / recolher planilha. */
export function PlanilhaExpandButton({
  expanded,
  onToggle,
  labelExpand = 'Expandir planilha',
  labelCollapse = 'Recolher planilha',
}: PlanilhaExpandButtonProps) {
  return (
    <IconButton
      size="small"
      aria-label={expanded ? labelCollapse : labelExpand}
      title={expanded ? labelCollapse : labelExpand}
      onClick={onToggle}
      sx={{ color: 'text.secondary' }}
    >
      {expanded ? (
        <CloseFullscreenRoundedIcon fontSize="small" />
      ) : (
        <OpenInFullRoundedIcon fontSize="small" />
      )}
    </IconButton>
  )
}
