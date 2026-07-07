import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEMO_ROUTE_BASE, mapPortalPath } from '@/utils/portalPaths'

interface DemoRouteContextValue {
  isDemo: boolean
  demoBannerHeight: number
  mapPath: (path: string) => string
  navigatePortal: (path: string) => void
}

const DemoRouteContext = createContext<DemoRouteContextValue | null>(null)

export const DEMO_BANNER_HEIGHT = 44

export function DemoRouteProvider({
  children,
  enabled,
}: {
  children: ReactNode
  enabled: boolean
}) {
  const navigate = useNavigate()
  const demoBase = enabled ? DEMO_ROUTE_BASE : null

  const mapPath = useCallback((path: string) => mapPortalPath(path, demoBase), [demoBase])

  const navigatePortal = useCallback(
    (path: string) => {
      navigate(mapPortalPath(path, demoBase))
    },
    [demoBase, navigate],
  )

  const value = useMemo(
    () => ({
      isDemo: enabled,
      demoBannerHeight: enabled ? DEMO_BANNER_HEIGHT : 0,
      mapPath,
      navigatePortal,
    }),
    [enabled, mapPath, navigatePortal],
  )

  return <DemoRouteContext.Provider value={value}>{children}</DemoRouteContext.Provider>
}

export function usePortalPaths() {
  const context = useContext(DemoRouteContext)
  const navigate = useNavigate()

  const mapPath = useCallback(
    (path: string) => context?.mapPath(path) ?? path,
    [context],
  )

  const navigatePortal = useCallback(
    (path: string) => {
      if (context) {
        context.navigatePortal(path)
        return
      }
      navigate(path)
    },
    [context, navigate],
  )

  return {
    isDemo: context?.isDemo ?? false,
    demoBannerHeight: context?.demoBannerHeight ?? 0,
    mapPath,
    navigatePortal,
  }
}
