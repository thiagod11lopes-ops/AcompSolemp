# Contrato `connection.json` (pareamento overlay — Etapa 12 / export Etapa 6)

Arquivo **opcional** na pasta de instalação do AcompOPMS (`connection.json`), exportado pelo **Acomp Server Manager** (Etapa 6) e importado pelo **instalador** (Etapa 11/12).

| Campo | Valor |
|-------|--------|
| Schema | **`acomopms-connection/1`** |
| Exemplo | [`Instalador OPMS/connection.json.example`](../Instalador%20OPMS/connection.json.example) |

## Uso no cliente

1. Instalador copia `connection.json` para `%LOCALAPPDATA%\AcompOPMS\` (ou Linux equivalente).
2. Ao abrir **AcompOPMS.exe**, o cliente:
   - valida o JSON;
   - grava `wireguard/acomopms.conf`;
   - tenta subir o túnel (WireGuard no Windows / `wg-quick` no Linux);
   - usa `server.loginUrl` como URL da aplicação quando o overlay está ativo.

Se WireGuard não estiver instalado ou faltar permissão de administrador, o app **continua em LAN** usando `acomopms-desktop.config.json` e registra aviso no log.

## Campos obrigatórios

- `schema`: `acomopms-connection/1`
- `overlay.enabled`: `true`
- `overlay.wireguard.privateKey`, `address`, `peer.publicKey`, `peer.endpoint`
- `server.loginUrl` ou `server.overlayOrigin` (recomendado)

## Segurança

- **Não commitar** `connection.json` com chaves reais.
- `privateKey` é segredo do cliente; distribuir apenas via Manager/export cifrado (Etapa 6).

## Relação com o servidor

Parâmetros do host overlay: `ACOMOPMS_OVERLAY_*` em `servidor.env` (Etapas 5–6). Até lá, use apenas LAN sem `connection.json`.
