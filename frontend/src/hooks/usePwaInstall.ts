import { useCallback, useEffect, useState } from 'react'
import {
  getDeferredInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEventLike,
} from '@/pwa/pwaInstallCapture'

const INSTALLED_KEY = 'acompopms-pwa-installed'

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

function isChromiumDesktop(): boolean {
  const ua = navigator.userAgent
  return /Chrome|Edg|Chromium/i.test(ua) && !/Mobile/i.test(ua)
}

/**
 * Captura o evento de instalação PWA e expõe ação para o botão da tela de instalação.
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(getDeferredInstallPrompt)
  const [standalone, setStandalone] = useState(isStandaloneDisplay)
  const [installed, setInstalled] = useState(
    () => isStandaloneDisplay() || readInstalledFlag(),
  )
  const [hint, setHint] = useState('')

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
        setHint('')
      }
    })
    const onInstalled = () => {
      setDeferred(null)
      writeInstalledFlag(true)
      setInstalled(true)
      setHint('Pronto! Abra o atalho AcompSolemp na área de trabalho.')
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      mq.removeEventListener('change', syncDisplay)
      unsub()
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const canInstall = Boolean(deferred) && !installed

  const install = useCallback(async () => {
    setHint('')
    if (installed && !deferred) {
      setHint('Já instalado. Use o atalho na área de trabalho ou no menu Iniciar.')
      return
    }
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      if (choice.outcome === 'accepted') {
        writeInstalledFlag(true)
        setInstalled(true)
        setHint('Pronto! Abra o atalho AcompSolemp na área de trabalho.')
      } else {
        setHint('Instalação cancelada. Toque de novo para tentar.')
      }
      return
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIos) {
      setHint('No iPhone/iPad: toque em Compartilhar → Adicionar à Tela de Início.')
      return
    }
    if (!window.isSecureContext) {
      setHint('Abra pelo HTTPS do servidor (https://IP/) para instalar.')
      return
    }

    let swOk = false
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      swOk = Boolean(reg)
    } catch {
      swOk = false
    }

    if (!swOk) {
      setHint(
        'Confirme o cadeado HTTPS sem aviso, recarregue e tente de novo. Ou use o menu ⋮ → Instalar aplicativo.',
      )
      return
    }

    if (isChromiumDesktop()) {
      setHint(
        'Use o menu ⋮ → Instalar aplicativo (ou Aplicativos → Instalar este site como um aplicativo).',
      )
      return
    }

    setHint('Use o menu (⋮) → Instalar aplicativo. Prefira Chrome ou Edge em HTTPS.')
  }, [deferred, installed])

  return { canInstall, installed, standalone, install, hint, setHint }
}
