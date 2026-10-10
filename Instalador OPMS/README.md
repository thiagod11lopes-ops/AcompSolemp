# Instalador OPMS

Componentes desktop do **AcompOPMS** (self-hosted, sem Tailscale externo).

| Pasta | Etapa | Função |
|-------|-------|--------|
| [`cliente/`](./cliente/) | **10** | App Electron — abre `startUrl` do servidor |
| [`instalador/`](./instalador/) | **11** | Wizard — URL, atalho **AcompOPMS**, grava `acomopms-desktop.config.json` |
| WireGuard no cliente | **12** | `connection.json` + túnel ao abrir o app |

O Manager LAN gera a URL; o usuário informa no wizard ou no `acomopms-desktop.config.json`.
