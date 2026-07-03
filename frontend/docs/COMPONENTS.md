# Documentação de Componentes

## Common

### `PageHeader`
Cabeçalho de página com título, subtítulo e slot de ação.

### `KpiCard`
Card animado para indicadores do dashboard (KPI). Suporta ícone, cor customizada e trend.

### `DataTable`
Tabela profissional baseada em TanStack Table com paginação integrada.

### `StatusChip`
Chip de status do processo com cores semafóricas (verde/amarelo/vermelho) ou "Concluído".

### `LoadingSpinner`
Estado de carregamento centralizado.

## Workflow

### `ProcessFilters`
Painel de filtros da tela principal: clínica, empresa, responsável, etapa, status, material e data.

### `ProcessTimeline`
Timeline vertical do processo com etapas concluídas/pendentes, responsável, datas, prazos e observações.

## Dashboard

### `DashboardCharts`
Gráficos Recharts: processos por mês, valor por etapa (pizza), tempo médio por etapa e gargalos.

### `RankingCards`
Rankings de clínicas, empresas e responsáveis.

## Notifications

### `NotificationPanel`
Menu de notificações no topbar com badge de não lidas e ações de marcar como lida.

## Layouts

### `MainLayout`
Layout principal com sidebar responsiva, topbar e área de conteúdo.

### `AuthLayout`
Layout da tela de login com gradiente institucional.

### `Sidebar` / `TopBar`
Navegação lateral filtrada por RBAC e barra superior com tema, notificações e perfil.

## Cadastros

### `ClinicasTab` / `EmpresasTab` / `MateriaisTab` / `UsuariosTab`
Abas de listagem dos cadastros base.

## Hooks

| Hook | Descrição |
|------|-----------|
| `useAuth` | Usuário autenticado, login/logout |
| `usePedidos` | Lista e detalhe de processos |
| `useDashboardMetrics` | Métricas do dashboard |
| `useClinicas` / `useEmpresas` / etc. | Cadastros e workflow |
| `useHistorico` | Eventos do histórico |
| `useNotifications` | Notificações com refetch automático |
| `useThemeMode` | Alternância tema claro/escuro |

## Utils

### `workflow.ts`
Motor de cálculo de dias na etapa, status de prazo e enriquecimento de pedidos.

### `permissions.ts`
RBAC por perfil de usuário.

### `format.ts`
Formatação de moeda, datas, CNPJ e telefone (pt-BR).
