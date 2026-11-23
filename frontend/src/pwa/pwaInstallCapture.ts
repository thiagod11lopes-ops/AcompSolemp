/** Captura early do beforeinstallprompt (antes do React montar). */

export interface BeforeInstallPromptEventLike extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type Listener = (event: BeforeInstallPromptEventLike | null) => void

let deferred: BeforeInstallPromptEventLike | null = null
const listeners = new Set<Listener>()

export function getDeferredInstallPrompt(): BeforeInstallPromptEventLike | null {
  return deferred
}

export function subscribeInstallPrompt(listener: Listener): () => void {
  listeners.add(listener)
  listener(deferred)
  return () => {
    listeners.delete(listener)
  }
}

function notify(next: BeforeInstallPromptEventLike | null) {
  deferred = next
  listeners.forEach((listener) => listener(next))
}

export function capturePwaInstallPromptEarly(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    notify(event as BeforeInstallPromptEventLike)
  })

  window.addEventListener('appinstalled', () => {
    notify(null)
  })
}
