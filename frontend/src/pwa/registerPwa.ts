/** Registra o service worker usado para instalação PWA (standalone). */
export function registerPwa(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const register = () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        void reg.update()
      })
      .catch(() => {
        // Silencioso: instalação PWA fica indisponível sem SW.
      })
  }

  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
