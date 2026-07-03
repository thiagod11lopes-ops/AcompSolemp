# AcompSOLEMP — Frontend

Sistema de gestão de **Materiais Consignados e SOLEMP** para Organização Militar Hospitalar da Marinha do Brasil.

> **Escopo atual:** apenas frontend, com autenticação simulada e dados mockados (Faker + localStorage). O backend será integrado futuramente.

## Tecnologias

- React 19 + TypeScript + Vite
- React Router (lazy loading / code splitting)
- TanStack Query + TanStack Table
- Material UI (tema claro/escuro)
- React Hook Form + Zod
- Recharts
- Axios (preparado para API futura)

## Módulos implementados

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Login | `/login` | Autenticação simulada com RBAC |
| Layout | — | Sidebar, topbar, notificações, tema |
| Dashboard | `/dashboard` | KPIs, gráficos e rankings |
| Processos | `/processos` | Tabela principal com filtros |
| Detalhe | `/processos/:id` | Timeline + histórico |
| Cadastros | `/cadastros` | Clínicas, empresas, materiais, usuários |
| Workflow | `/workflow` | Visualização das etapas |
| Histórico | `/historico` | Log imutável de eventos |
| Relatórios | `/relatorios` | Indicadores consolidados |
| Configuração | `/configuracao` | Prazos do workflow |

## Como executar

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`

## Dois portais

| Portal | URL | Login demo |
|--------|-----|------------|
| **Gestor** (acompanhamento global) | `/login` → `/gestor/dashboard` | gestor / gestor123 |
| **Clínica** (pedidos próprios) | `/clinica/login` → `/clinica/pedidos` | clinica / clinica123 |

O gestor tem **acesso total** a dashboard, processos, cadastros, workflow, prazos, histórico e relatórios.

A clínica pode **solicitar material**, **confirmar recebimento**, **confeccionar SOLEMP**, **anexar NF** e **enviar ao financeiro** — vendo apenas os pedidos da sua unidade.

| Login | Senha | Perfil |
|-------|-------|--------|
| admin | admin123 | Administrador |
| gestor | gestor123 | Gestor |
| clinica | clinica123 | Clínica |
| assinante | assinante123 | Assinante |
| financeiro | financeiro123 | Financeiro |
| consulta | consulta123 | Consulta |

## Indicadores de prazo

- **Verde** — dentro do prazo
- **Amarelo** — faltam 2 dias ou menos
- **Vermelho** — prazo vencido

## Estrutura do projeto

```
src/
├── components/     # UI reutilizável
├── contexts/       # Auth, Theme
├── hooks/          # React Query hooks
├── layouts/        # MainLayout, AuthLayout
├── mocks/          # Seed Faker + localStorage
├── pages/          # Páginas por módulo
├── routes/         # Rotas protegidas
├── services/       # Camada de dados (mock)
├── theme/          # Tema MUI
├── types/          # Tipagem forte
└── utils/          # Workflow, formatação, permissões
```

## Integração futura com backend

Os serviços em `src/services/` estão preparados para substituir chamadas mock por endpoints REST:

- `authService` → `POST /api/auth/login`
- `pedidoService` → `GET /api/pedidos`, `GET /api/dashboard`
- `cadastroService` → CRUD de entidades
- `workflowService` → configuração de etapas

## Documentação adicional

- [Componentes](./docs/COMPONENTS.md)

## Scripts

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
```
