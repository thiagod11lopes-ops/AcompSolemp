import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || iosStandalone
}

/**
 * Captura o evento de instalação PWA e expõe ação para o botão da tela de login.
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandaloneDisplay)
  const [hint, setHint] = useState('')

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setHint('')
    }
    const onInstalled = () => {
      setDeferred(null)
      setInstalled(true)
      setHint('AcompSolemp instalado. Use o atalho na área de trabalho ou no menu Iniciar.')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const canInstall = Boolean(deferred) && !installed

  const install = useCallback(async () => {
    setHint('')
    if (installed) {
      setHint('O AcompSolemp já está instalado neste dispositivo.')
      return
    }
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        setHint('Instalação iniciada. O atalho deve aparecer na área de trabalho.')
      } else {
        setHint('Instalação cancelada.')
      }
      return
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIos) {
      setHint('No iPhone/iPad: toque em Compartilhar → Adicionar à Tela de Início.')
      return
    }
    if (!window.isSecureContext) {
      setHint('Abra o sistema em HTTPS (URL do servidor) para poder instalar o aplicativo.')
      return
    }
    setHint(
      'Neste navegador, use o menu (⋮) → Instalar aplicativo / Instalar AcompOPMS. Se a opção não aparecer, use Chrome ou Edge em HTTPS.',
    )
  }, [deferred, installed])

  return { canInstall, installed, install, hint, setHint }
}
