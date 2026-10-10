# Instalador AcompOPMS — wizard (Etapa 11)

Aplicativo **Electron** para instalar o cliente desktop em outro PC da rede:

1. Usuário cola a **URL do servidor** (Manager LAN).
2. Opção **atalho na área de trabalho** — **AcompOPMS** (marcada por padrão).
3. Copia runtime + app para `%LOCALAPPDATA%\AcompOPMS` (Windows) ou `~/.local/share/AcompOPMS` (Linux).
4. Grava `acomopms-desktop.config.json` com `startUrl`.

## Desenvolvimento

```bash
cd "Instalador OPMS/instalador"
npm install
npm start
```

`npm start` executa `prepare-payload` (monta `resources/payload/` a partir de `../cliente` + Electron).

## Comportamento Windows

- Staging em `%TEMP%` antes de substituir a instalação.
- Pasta anterior renomeada para `AcompOPMS.old-<timestamp>`.
- `taskkill` best-effort em `AcompOPMS.exe` antes de copiar.
- Cópia com **robocopy**; atalho via PowerShell (`WScript.Shell`).

## Testes

```bash
npm run test:unit
```

## Build portable (Etapa 13)

Local (Windows):

```bash
npm ci
npm run build:win
# dist/AcompOPMS-Instalador-<versão>-win-x64.exe
```

Linux AppImage: `npm run build:linux`

CI: workflow [`.github/workflows/build-instalador-opms.yml`](../../.github/workflows/build-instalador-opms.yml) — artefatos nos Actions.

Cliente instalado: [`../cliente/`](../cliente/).
