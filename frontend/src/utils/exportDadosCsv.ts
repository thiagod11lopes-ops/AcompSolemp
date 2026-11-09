/**
 * Dispara salvamento unico CSV (DadosOMPS com data/hora).
 * Usa same-origin /api/export-dados (nginx/Vite → API local :9788),
 * evitando mixed content HTTPS→HTTP e dependencia do Dashboard.
 */
const EXPORT_PATH = '/api/export-dados'

/** Fire-and-forget: nao bloqueia a UI se a API local estiver offline. */
export function requestDadosCsvExport(): void {
  try {
    const url = new URL(EXPORT_PATH, window.location.origin).toString()
    void fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => {
      /* API local offline — export opcional */
    })
  } catch {
    /* ignore */
  }
}
