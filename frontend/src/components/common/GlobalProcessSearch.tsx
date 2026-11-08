import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, TextField, Typography, InputAdornment } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useLocation } from 'react-router-dom'
import {
  clearPageSearchHighlights,
  highlightPageText,
  PAGE_SEARCH_SKIP_ATTR,
} from '@/utils/pageTextSearch'
import type { GlobalSearchPortal } from '@/utils/globalProcessSearch'

interface GlobalProcessSearchProps {
  /** Mantido por compatibilidade com as topbars; a busca é na página atual. */
  portal?: GlobalSearchPortal
  dense?: boolean
}

function getPageSearchRoot(): HTMLElement | null {
  return document.querySelector('main')
}

export function GlobalProcessSearch({ dense = false }: GlobalProcessSearchProps) {
  const location = useLocation()
  const [input, setInput] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const applyingRef = useRef(false)
  const inputRef = useRef(input)
  inputRef.current = input

  const applySearch = useCallback(() => {
    const root = getPageSearchRoot()
    if (!root) {
      setMatchCount(0)
      return
    }
    applyingRef.current = true
    try {
      const n = highlightPageText(root, inputRef.current)
      setMatchCount(n)
    } finally {
      window.setTimeout(() => {
        applyingRef.current = false
      }, 0)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(applySearch, 140)
    return () => window.clearTimeout(timer)
  }, [input, location.pathname, location.search, applySearch])

  useEffect(() => {
    const root = getPageSearchRoot()
    if (!root || !input.trim()) return

    let timer = 0
    const obs = new MutationObserver(() => {
      if (applyingRef.current) return
      window.clearTimeout(timer)
      timer = window.setTimeout(applySearch, 220)
    })
    obs.observe(root, { childList: true, subtree: true, characterData: true })
    return () => {
      obs.disconnect()
      window.clearTimeout(timer)
    }
  }, [input, applySearch])

  useEffect(
    () => () => {
      const root = getPageSearchRoot()
      if (root) clearPageSearchHighlights(root)
    },
    [],
  )

  const trimmed = input.trim()

  return (
    <Box
      {...{ [PAGE_SEARCH_SKIP_ATTR]: '' }}
      sx={{
        width: { xs: 148, sm: 220, md: 280 },
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0.25,
      }}
    >
      <TextField
        size="small"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder=""
        aria-label="Buscar nesta página"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            sx: { bgcolor: 'background.default' },
          },
        }}
        sx={{
          '& .MuiInputBase-root': {
            minHeight: dense ? 36 : undefined,
          },
        }}
      />
      {trimmed ? (
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, lineHeight: 1.2 }}>
          {matchCount === 0
            ? 'Nenhum resultado nesta página'
            : `${matchCount} encontrado${matchCount === 1 ? '' : 's'}`}
        </Typography>
      ) : null}
    </Box>
  )
}
