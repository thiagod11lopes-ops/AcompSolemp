import { useCallback, useEffect, useState } from 'react'
import {
  getDeferredInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEventLike,
} from '@/pwa/pwaInstallCapture'

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || iosStandalone
}

function isChromiumDesktop(): boolean {
  const ua = navigator.userAgent
  return /Chrome|Edg|Chromium/i.test(ua) && !/Mobile/i.test(ua)
}

/**
 * Captura o evento de instalação PWA e expõe ação para o botão da tela de login.
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(getDeferredInstallPrompt)
  const [installed, setInstalled] = useState(isStandaloneDisplay)
  const [hint, setHint] = useState('')

  useEffect(() => {
    const unsub = subscribeInstallPrompt((event) => {
      setDeferred(event)
      if (event) setHint('')
    })
    const onInstalled = () => {
      setDeferred(null)
      setInstalled(true)
      setHint('AcompSolemp instalado. Use o atalho na área de trabalho ou no menu Iniciar.')
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      unsub()
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
      setHint('Abra pelo atalho HTTPS do servidor (ex.: https://IP/) — HTTP não permite instalar o app.')
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
        'O navegador ainda não liberou a instalação (certificado local ou Service Worker). Confirme o cadeado HTTPS sem aviso, recarregue a página e tente de novo. Se continuar, no Chrome/Edge: menu ⋮ → Instalar aplicativo / Instalar AcompSolemp.',
      )
      return
    }

    if (isChromiumDesktop()) {
      setHint(
        'O Chrome/Edge ainda não ofereceu o prompt automático. Use o menu ⋮ → Instalar aplicativo (ou Aplicativos → Instalar este site como um aplicativo). Se a opção não aparecer, confie no certificado local (etapa CA do instalador) e recarregue em https://IP/.',
      )
      return
    }

    setHint(
      'Neste navegador, use o menu (⋮) → Instalar aplicativo / Instalar AcompSolemp. Prefira Chrome ou Edge em HTTPS.',
    )
  }, [deferred, installed])

  return { canInstall, installed, install, hint, setHint }
}
