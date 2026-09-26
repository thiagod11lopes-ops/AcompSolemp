import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface PageTitleState {
  title: string
  subtitle?: string
}

interface PageTitleContextValue extends PageTitleState {
  setPageTitle: (title: string, subtitle?: string) => void
  clearPageTitle: () => void
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null)

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageTitleState>({ title: '' })

  const setPageTitle = useCallback((title: string, subtitle?: string) => {
    setState({ title, subtitle: subtitle?.trim() || undefined })
  }, [])

  const clearPageTitle = useCallback(() => {
    setState({ title: '' })
  }, [])

  const value = useMemo(
    () => ({
      title: state.title,
      subtitle: state.subtitle,
      setPageTitle,
      clearPageTitle,
    }),
    [state.title, state.subtitle, setPageTitle, clearPageTitle],
  )

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
}

export function usePageTitleContext() {
  const ctx = useContext(PageTitleContext)
  if (!ctx) throw new Error('usePageTitleContext must be used within PageTitleProvider')
  return ctx
}

/** Define o título da barra superior enquanto a página estiver montada. */
export function usePageTitle(title: string, subtitle?: string) {
  const { setPageTitle, clearPageTitle } = usePageTitleContext()

  useEffect(() => {
    setPageTitle(title, subtitle)
    return () => clearPageTitle()
  }, [title, subtitle, setPageTitle, clearPageTitle])
}
