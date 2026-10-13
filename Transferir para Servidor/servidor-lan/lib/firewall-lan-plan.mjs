/** Nomes estáveis das regras Windows (Etapa 4B / Tailnet). */
export const FIREWALL_RULE_NAMES = {
  lanHttp: 'AcompOPMS - LAN HTTP (TCP 8080)',
  tailnetHttp: 'AcompOPMS - Tailnet HTTP (TCP 8080)',
  blockSupabase: 'AcompOPMS - Bloquear Supabase na LAN (TCP)',
}

/**
 * Faixa tailnet RFC 6598 (100.64.0.0/10).
 * Formato aceito por New-NetFirewallRule -RemoteAddress no Windows.
 */
export const TAILNET_REMOTE_ADDRESS = '100.64.0.0/255.192.0.0'

/**
 * Alias documental no plano JSON (runtime Windows descobre o nome real, ex.: Tailscale Tunnel).
 */
export const TAILSCALE_INTERFACE_ALIAS = 'Tailscale'

/**
 * @param {Record<string, string | undefined>} envVars
 * @returns {'tailnet' | 'local'}
 */
export function parseFirewallScope(envVars = {}) {
  const raw = envVars.ACOMOPMS_FIREWALL_SCOPE
  if (raw == null || String(raw).trim() === '') return 'local'
  const v = String(raw).trim().toLowerCase()
  return v === 'tailnet' ? 'tailnet' : 'local'
}

/**
 * Plano da regra Allow TCP HTTP (8080). Não executa PowerShell — só parâmetros.
 * @param {{
 *   firewallScope: 'tailnet' | 'local',
 *   httpPort: number,
 *   tailscaleInterfaceAlias?: string,
 * }} input
 */
export function buildHttpAllowRulePlan(input) {
  const httpPort = input.httpPort
  const tailscaleInterfaceAlias = input.tailscaleInterfaceAlias ?? TAILSCALE_INTERFACE_ALIAS

  if (input.firewallScope === 'tailnet') {
    return {
      mode: 'tailnet',
      displayName: FIREWALL_RULE_NAMES.tailnetHttp,
      description:
        'AcompOPMS — HTTP Caddy :8080 apenas na interface Tailscale; remoto tailnet 100.64.0.0/10.',
      direction: 'Inbound',
      action: 'Allow',
      protocol: 'TCP',
      localPort: httpPort,
      /** Perfil Private cobre o adaptador Tailscale; Public (Wi‑Fi convidado) fica de fora. */
      profiles: ['Private'],
      excludedProfiles: ['Public', 'Domain'],
      interfaceAlias: tailscaleInterfaceAlias,
      remoteAddress: TAILNET_REMOTE_ADDRESS,
      removeLegacyLanHttpRule: true,
      legacyLanHttpRuleName: FIREWALL_RULE_NAMES.lanHttp,
    }
  }

  return {
    mode: 'local',
    displayName: FIREWALL_RULE_NAMES.lanHttp,
    description: 'AcompOPMS servidor LAN — HTTP via Caddy (Etapa 4B)',
    direction: 'Inbound',
    action: 'Allow',
    protocol: 'TCP',
    localPort: httpPort,
    profiles: ['Private'],
    excludedProfiles: [],
    interfaceAlias: null,
    remoteAddress: null,
    removeLegacyLanHttpRule: false,
    removeTailnetHttpRule: true,
    tailnetHttpRuleName: FIREWALL_RULE_NAMES.tailnetHttp,
  }
}

/**
 * @param {Record<string, string | undefined>} envVars
 * @param {number} [httpPort=8080]
 */
export function buildHttpAllowRulePlanFromEnv(envVars, httpPort = 8080) {
  const scope = parseFirewallScope(envVars)
  const port = Number.parseInt(String(envVars.ACOMOPMS_HTTP_PORT ?? ''), 10) || httpPort
  return buildHttpAllowRulePlan({ firewallScope: scope, httpPort: port })
}
