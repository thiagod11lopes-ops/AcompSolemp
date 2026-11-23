# Checklist — Etapa 5 (overlay servidor)

Pré-requisito: Etapas 1–4 (servidor LAN funcionando).

## Preparar `servidor.env`

- [ ] `ACOMOPMS_OVERLAY_ENABLED=true`
- [ ] `ACOMOPMS_OVERLAY_HOST` (IP WG do servidor, ex. `100.64.0.1`)
- [ ] `ACOMOPMS_OVERLAY_SERVER_NAME`, `ACOMOPMS_OVERLAY_PUBLIC_ENDPOINT`
- [ ] Headscale URL se já existir infra (opcional até Etapa 6)

## WireGuard no host

- [ ] `wg` / WireGuard instalado
- [ ] Linux: `bash aplicar-overlay-servidor.sh` **ou** Windows: `aplicar-overlay-servidor.ps1`
- [ ] Existe `overlay/overlay-state.json` (não commitar)
- [ ] Auth Supabase reiniciado (redirects overlay)

## Rede

- [ ] UDP `ACOMOPMS_OVERLAY_WG_PORT` encaminhado no roteador
- [ ] Windows Admin: `corrigir-firewall-overlay.ps1`
- [ ] Túnel ativo: `start-overlay-servidor.*`

## Validação

- [ ] `server-connection.json` mostra `overlay.enabled: true` e `serverPublicKey`
- [ ] **Etapa 6:** exportar `connection.json` para clientes
