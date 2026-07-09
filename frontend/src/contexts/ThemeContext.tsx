import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { darkTheme, lightTheme } from '@/theme/theme'
import { STORAGE_KEYS, storageGet, storageSet } from '@/storage/indexedDb'

type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitialMode(): ThemeMode {
  const stored = storageGet(STORAGE_KEYS.THEME)
  if (stored === 'light') return 'light'
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readInitialMode)

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      storageSet(STORAGE_KEYS.THEME, next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme])
  const theme = mode === 'light' ? lightTheme : darkTheme

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useThemeMode() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useThemeMode must be used within ThemeProvider')
  return context
}
