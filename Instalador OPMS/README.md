# Instalador OPMS

Componentes desktop do **AcompOPMS** (self-hosted, sem Tailscale externo).

| Pasta | Etapa | Função |
|-------|-------|--------|
| [`cliente/`](./cliente/) | **10** | App Electron — abre `startUrl` do servidor |
| `instalador/` | 11 | Wizard que copia payload e grava config |
| WireGuard no cliente | 12 | VPN embutida (futuro) |

O Manager LAN gera a URL; o usuário informa no wizard ou no `acomopms-desktop.config.json`.
