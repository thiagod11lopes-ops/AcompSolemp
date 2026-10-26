/** Dispara salvamento unico CSV (DadosOMPS com data/hora) via Dashboard local. */
const DASHBOARD_EXPORT_URL = 'http://127.0.0.1:9787/api/export-dados'

/** Fire-and-forget: nao bloqueia a UI se o Dashboard estiver fechado. */
export function requestDadosCsvExport(): void {
  try {
    void fetch(DASHBOARD_EXPORT_URL, {
      method: 'POST',
      mode: 'cors',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => {
      /* Dashboard offline — export opcional */
    })
  } catch {
    /* ignore */
  }
}
