# AcompSOLEMP

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

## Publicar no GitHub

O código está versionado com Git. Para enviar ao GitHub e habilitar atualizações automáticas:

```bash
# 1. Autenticar (uma vez)
gh auth login

# 2. Criar repositório e enviar (na pasta raiz do projeto)
gh repo create AcompSolemp --private --source=. --remote=origin --push
```

Após o push na branch `main`, o GitHub Actions valida o build automaticamente (aba **Actions**).

> **GitHub Pages:** contas gratuitas não publicam sites em repositórios **privados**. Para hospedar o app na web, torne o repositório público ou use Vercel/Netlify conectado ao GitHub.

## Login de demonstração

- **gestor** / gestor123 — acesso ao dashboard completo
- **clinica** / clinica123 — vê apenas processos da própria clínica
- **admin** / admin123 — acesso total
