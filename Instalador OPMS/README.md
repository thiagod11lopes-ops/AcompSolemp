# Instalador OPMS

Instalador **gráfico** do cliente desktop **AcompOPMS** (Windows e Linux): interface moderna, **barra de progresso**, campo **URL** na instalação, app **sem barra de endereços** após instalar.

## O que colocar no seu PC

No **Windows**, após gerar os arquivos:

```
C:\Users\User\Desktop\Thiago\Projetos\Instalador OPMS\
  Instalar-AcompOPMS-1.0.0-Windows.exe   ← ícone de instalação (duplo clique)
  Instalar-AcompOPMS.ico                 ← opcional (ícone da pasta)
  LEIA-ME.txt
```

> Este Agent **não cria** pastas em `C:\` automaticamente. Use o script abaixo **no seu Windows**.

## Gerar instalador (Windows)

```powershell
cd "C:\Users\User\Desktop\Thiago\Projetos\AcompSolemp\Instalador OPMS"
.\scripts\build-tudo.ps1
.\scripts\preparar-pasta-windows.ps1
```

Requisitos: **Node.js 20+**, npm.

## Gerar instalador (Linux)

```bash
cd "Instalador OPMS"
bash scripts/build-tudo.sh
```

Saída: `Para-distribuir/Instalar-AcompOPMS-1.0.0-Linux.AppImage`

## Estrutura

| Pasta | Função |
|--------|--------|
| `cliente/` | App AcompOPMS (Electron, abre a URL) |
| `instalador/` | Assistente visual com barra de progresso |
| `Para-distribuir/` | Instaladores prontos para copiar/distribuir |
| `scripts/` | Build e preparação da pasta no Desktop |

## Fluxo do usuário final

1. Duplo clique em **Instalar-AcompOPMS-….exe** (ou AppImage no Linux).
2. Informar URL (ex.: `https://thiagod11lopes-ops.github.io/AcompSolemp/`).
3. Escolher pasta → **Instalar** (barra de progresso).
4. Abrir **AcompOPMS** — atualizações vêm do deploy web (como no Chrome).

Não substitui o **servidor LAN** (Supabase local + Caddy).
