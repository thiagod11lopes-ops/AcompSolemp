# AcompOPMS — Cliente desktop (URL configurável)

Programa **Windows** que abre o AcompOPMS em uma janela **sem barra de endereços**, carregando a URL informada **na instalação** (ex.: GitHub Pages).

Atualizações no GitHub: após cada publicação na web, **feche e abra** o AcompOPMS (ou F5 se habilitar atalho futuro) — o comportamento é o mesmo de acessar pelo Chrome, pois o conteúdo vem da URL remota.

Não substitui o **servidor LAN** (Supabase local + Caddy). Use este cliente quando o sistema estiver hospedado em **HTTPS** (GitHub Pages ou outro).

## Requisitos (máquina de build)

- Windows 10/11 x64
- [Node.js 20+](https://nodejs.org/)
- npm

## Gerar o instalador (.exe Setup)

Na pasta `desktop-launcher`:

```powershell
npm install
npm run dist:win
```

Saída: `desktop-launcher/dist/AcompOPMS Setup 1.0.0.exe` (nome pode variar).

Durante a instalação aparece um campo **URL do sistema** (padrão: `https://thiagod11lopes-ops.github.io/AcompSolemp/`).

O instalador grava `acomopms-desktop.config.json` em `{pasta de instalação}` com a URL escolhida.

## Testar sem instalar

```powershell
npm install
npm run start:url -- "https://thiagod11lopes-ops.github.io/AcompSolemp/"
```

## Alterar a URL depois

Edite `{pasta de instalação}\acomopms-desktop.config.json`:

```json
{
  "startUrl": "https://thiagod11lopes-ops.github.io/AcompSolemp/",
  "productName": "AcompOPMS"
}
```

Ou reinstale e informe a nova URL.

## Segurança

- Navegação restrita à **mesma origem** da URL configurada; outros links abrem no navegador padrão.
- Use preferencialmente **HTTPS**.
