/**
 * Gera Caddyfile LAN: escuta em 0.0.0.0:{porta}; proxy Supabase só via upstream loopback.
 */

/** @param {string} supabaseInternal ex.: http://127.0.0.1:54321 */
export function assertSupabaseInternalIsLoopback(supabaseInternal) {
  let parsed
  try {
    parsed = new URL(supabaseInternal.replace(/\/+$/, ''))
  } catch {
    throw new Error(`ACOMOPMS_SUPABASE_INTERNAL invalido: ${supabaseInternal}`)
  }
  const host = parsed.hostname.toLowerCase()
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `Caddy deve usar Supabase interno em loopback (127.0.0.1), nao ${host}`,
    )
  }
}

/**
 * @param {{
 *   httpPort: number,
 *   supabaseInternal: string,
 * }} cfg
 * @param {{ distRoot: string }} paths
 */
export function buildCaddyfileContent(cfg, paths) {
  const httpPort = cfg.httpPort
  const kongUpstream = cfg.supabaseInternal.replace(/\/+$/, '')
  assertSupabaseInternalIsLoopback(kongUpstream)
  const distRoot = paths.distRoot.replace(/\\/g, '/')

  return `# Gerado por servidor-lan/generate-caddyfile.mjs — não editar à mão
{
\tauto_https off
}

:${httpPort} {
\tbind 0.0.0.0

\t@supabase path /auth/* /rest/* /storage/* /realtime/* /functions/* /mcp/* /graphql/*
\thandle @supabase {
\t\treverse_proxy ${kongUpstream} {
\t\t\ttransport http {
\t\t\t\tread_timeout 300s
\t\t\t}
\t\t}
\t}

\thandle {
\t\troot * ${distRoot}
\t\ttry_files {path} /index.html
\t\tfile_server
\t}
}
`
}
