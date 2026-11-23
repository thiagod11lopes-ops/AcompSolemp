# Checklist — Etapa 6 (pareamento / connection.json)

Pré-requisito: [Etapa 5](./CHECKLIST-ETAPA5-OVERLAY.md) concluída (`overlay-state.json`).

## Exportar para um cliente

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/exportar-connection-json.ps1" -Name "PC-Gestor"
```

Linux:

```bash
bash "Transferir para Servidor/servidor-lan/exportar-connection-json.sh" --name "PC-Gestor"
```

- [ ] Arquivo gerado em `overlay/exports/connection-*.json` (**não commitar**)
- [ ] Entregar ao usuário de forma segura (USB, canal cifrado)

## Instalar no cliente

- [ ] Instalador Etapa 11 → **Escolher connection.json**
- [ ] Ou copiar manualmente para `%LOCALAPPDATA%\AcompOPMS\connection.json`
- [ ] Abrir AcompOPMS (Etapa 12 sobe WireGuard + URL overlay)

## Servidor

- [ ] Peer presente em `overlay/wireguard/acomopms-server.conf`
- [ ] Reiniciar túnel WG após novo peer
- [ ] `paired-clients.json` registra o cliente (gitignored)
