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

## Export no servidor (Etapa 6)

Após [Etapa 5](../Transferir%20para%20Servidor/servidor-lan/CHECKLIST-ETAPA5-OVERLAY.md):

```bash
node "Transferir para Servidor/servidor-lan/exportar-connection-json.mjs" --name "Nome-do-PC"
```

Saída em `servidor-lan/overlay/exports/` (gitignored). O script adiciona o peer em `acomopms-server.conf` e registra em `paired-clients.json`.

Checklist: [CHECKLIST-ETAPA6-PAIRING.md](../Transferir%20para%20Servidor/servidor-lan/CHECKLIST-ETAPA6-PAIRING.md).

## Relação com o servidor

Parâmetros do host overlay: `ACOMOPMS_OVERLAY_*` em `servidor.env` (Etapa 5). Sem overlay, use apenas LAN sem `connection.json`.
