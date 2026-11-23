import { useCallback, useEffect, useState } from 'react'
import {
  getDeferredInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEventLike,
} from '@/pwa/pwaInstallCapture'

const INSTALLED_KEY = 'acompopms-pwa-installed'

export type PwaInstallResult =
  | 'accepted'
  | 'dismissed'
  | 'already-installed'
  | 'needs-manual'
  | 'insecure'
  | 'unavailable'

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || iosStandalone
}

function readInstalledFlag(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
    return false
  }
}

function writeInstalledFlag(value: boolean) {
  try {
    if (value) localStorage.setItem(INSTALLED_KEY, '1')
    else localStorage.removeItem(INSTALLED_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Captura o evento de instalação PWA e expõe ação para o modal de instalação.
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(getDeferredInstallPrompt)
  const [standalone, setStandalone] = useState(isStandaloneDisplay)
  const [installed, setInstalled] = useState(
    () => isStandaloneDisplay() || readInstalledFlag(),
  )

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const syncDisplay = () => {
      const next = isStandaloneDisplay()
      setStandalone(next)
      if (next) {
        writeInstalledFlag(true)
        setInstalled(true)
      }
    }
    syncDisplay()
    mq.addEventListener('change', syncDisplay)

    const unsub = subscribeInstallPrompt((event) => {
      setDeferred(event)
      if (event) {
        writeInstalledFlag(false)
        setInstalled(false)
      }
    })
    const onInstalled = () => {
      setDeferred(null)
      writeInstalledFlag(true)
      setInstalled(true)
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      mq.removeEventListener('change', syncDisplay)
      unsub()
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const canInstall = Boolean(deferred) && !installed

  const markInstalled = useCallback(() => {
    writeInstalledFlag(true)
    setInstalled(true)
    setDeferred(null)
  }, [])

  const install = useCallback(async (): Promise<PwaInstallResult> => {
    if (installed && !deferred) return 'already-installed'

    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      if (choice.outcome === 'accepted') {
        writeInstalledFlag(true)
        setInstalled(true)
        return 'accepted'
      }
      return 'dismissed'
    }

    if (!window.isSecureContext) return 'insecure'
    return 'needs-manual'
  }, [deferred, installed])

  return { canInstall, installed, standalone, install, markInstalled }
}
