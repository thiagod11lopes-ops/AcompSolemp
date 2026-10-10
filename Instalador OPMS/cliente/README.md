# AcompOPMS — cliente desktop (Etapa 10)

Shell **Electron** que abre o sistema hospedado no **servidor LAN** (Caddy), **sem barra de endereço**. A URL vem do Acomp Server Manager / instalador (Etapa 11).

## Configuração

Arquivo **`acomopms-desktop.config.json`** (ou variável de ambiente):

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `startUrl` | sim | Ex.: `http://192.168.0.42:8080/login` |
| `discoverConnection` | não | Se `true` (padrão), tenta `GET /server-connection.json` na mesma origem |
| `windowTitle` | não | Título da janela (padrão `AcompOPMS`) |

Ordem de busca do arquivo:

1. `ACOMOPMS_START_URL` (env)
2. `./acomopms-desktop.config.json` (pasta do app)
3. Windows: `%LOCALAPPDATA%\AcompOPMS\acomopms-desktop.config.json`
4. Linux: `~/.local/share/AcompOPMS/acomopms-desktop.config.json`

Copie [`acomopms-desktop.config.example.json`](./acomopms-desktop.config.example.json) para testar.

## Desenvolvimento

```bash
cd "Instalador OPMS/cliente"
npm install
cp acompopms-desktop.config.example.json acompopms-desktop.config.json
# edite startUrl para o seu servidor LAN
npm start
```

Testes unitários (sem Electron):

```bash
npm run test:unit
```

## Comportamento

- Navegação **mesma origem** do `startUrl` (SPA + API via Caddy).
- Links para **outras origens** abrem no navegador padrão.
- Descoberta opcional alinha a URL com [`server-connection.json`](../../docs/server-manifest-contract.md#8-runtime-server-connectionjson) (Etapa 7).

### Overlay / WireGuard (Etapa 12)

Com `connection.json` na pasta de instalação, o app gera `wireguard/acomopms.conf` e tenta subir o túnel antes de abrir a URL (`server.loginUrl`). Requer WireGuard instalado no SO (runtime embutido: Etapa 13). Contrato: [`docs/connection-json-contract.md`](../../docs/connection-json-contract.md).

Empacotamento portable: **Etapa 13** (CI). Wizard: **Etapa 11** (`instalador/`).

Contrato geral: [`docs/server-manifest-contract.md`](../../docs/server-manifest-contract.md).
