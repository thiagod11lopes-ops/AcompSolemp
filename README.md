# AcompOPMS

Sistema de gestão de **Materiais Consignados e SOLEMP** para Organização Militar Hospitalar da Marinha do Brasil.

## Status do projeto

| Camada | Status |
|--------|--------|
| Frontend | Implementado (mock) |
| Backend | Pendente |

## Início rápido

```bash
cd frontend
npm install
npm run dev
```

Documentação completa em [frontend/README.md](./frontend/README.md).

## Servidor LAN e Acomp Server Manager

Instalação self-hosted (Supabase local + Caddy na rede): [`Transferir para Servidor/servidor-lan/README.md`](./Transferir%20para%20Servidor/servidor-lan/README.md).

Contrato para o futuro **Acomp Server Manager** (manifesto, schema, URLs, overlay planejado): [`docs/server-manifest-contract.md`](./docs/server-manifest-contract.md) — manifesto [`server-manifest.json`](./server-manifest.json).

## Publicar no GitHub

O código está versionado com Git. Para enviar ao GitHub e habilitar atualizações automáticas:

```bash
# 1. Autenticar (uma vez)
gh auth login

# 2. Criar repositório e enviar (na pasta raiz do projeto)
gh repo create AcompSolemp --private --source=. --remote=origin --push
```

Após o push na branch `main`, o GitHub Actions publica o frontend em **GitHub Pages**.

**URL do sistema (repositório GitHub ainda chamado AcompSolemp):** https://thiagod11lopes-ops.github.io/AcompSolemp/

### Habilitar Pages (uma vez)

1. O repositório precisa ser **público** (Settings → Danger zone → Change visibility).
2. Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.
3. Faça um push na `main` ou rode o workflow **Deploy GitHub Pages** manualmente em Actions.

> Repositórios **privados** no plano gratuito não suportam GitHub Pages.

## Login de demonstração

- **gestor** / gestor123 — acesso ao dashboard completo
- **clinica** / clinica123 — vê apenas processos da própria clínica
- **admin** / admin123 — acesso total
