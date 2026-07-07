import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { ClinicaLayout } from '@/layouts/ClinicaLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { GestorProtectedRoute, ClinicaProtectedRoute, OrdenadorProtectedRoute, FinanceiroProtectedRoute, GuestRoute } from '@/routes/PortalRoutes'
import { GestorDemoShell } from '@/routes/GestorDemoShell'
import { OrdenadorLayout } from '@/layouts/OrdenadorLayout'
import { FinanceiroLayout } from '@/layouts/FinanceiroLayout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary'
import { useAuth } from '@/contexts/AuthContext'

function HomeRedirect() {
  const { gestorUser, clinicaUser, ordenadorUser, financeiroUser } = useAuth()
  if (gestorUser) return <Navigate to="/gestor/dashboard" replace />
  if (financeiroUser) return <Navigate to="/financeiro/pagamentos" replace />
  if (ordenadorUser) return <Navigate to="/ordenador/timelines" replace />
  if (clinicaUser) return <Navigate to="/clinica/timelines" replace />
  return <Navigate to="/login" replace />
}

const LoginGestorPage = lazy(() => import('@/pages/LoginGestorPage'))
const TimelineEntryPage = lazy(() => import('@/pages/clinica/TimelineEntryPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ProcessosPage = lazy(() => import('@/pages/ProcessosPage'))
const ProcessoDetailPage = lazy(() => import('@/pages/ProcessoDetailPage'))
const CadastrosPage = lazy(() => import('@/pages/CadastrosPage'))
const HistoricoPage = lazy(() => import('@/pages/HistoricoPage'))
const RelatoriosPage = lazy(() => import('@/pages/RelatoriosPage'))
const GestorReversoesPage = lazy(() => import('@/pages/GestorReversoesPage'))
const GestorTimelinesPage = lazy(() => import('@/pages/GestorTimelinesPage'))
const GestorArquivadosPage = lazy(() => import('@/pages/GestorArquivadosPage'))
const DemoEntryPage = lazy(() => import('@/pages/gestor/DemoEntryPage'))
const ConfiguracaoPage = lazy(() => import('@/pages/ConfiguracaoPage'))
const ClinicaPedidosPage = lazy(() => import('@/pages/clinica/ClinicaPedidosPage'))
const ClinicaNovoPedidoPage = lazy(() => import('@/pages/clinica/ClinicaNovoPedidoPage'))
const ClinicaTimelinePage = lazy(() => import('@/pages/clinica/ClinicaTimelinePage'))
const ClinicaTimelineDetailPage = lazy(() => import('@/pages/clinica/ClinicaTimelineDetailPage'))
const ClinicaPedidoDetailPage = lazy(() => import('@/pages/clinica/ClinicaPedidoDetailPage'))
const OrdenadorTimelinesPage = lazy(() => import('@/pages/ordenador/OrdenadorTimelinesPage'))
const OrdenadorTimelineDetailPage = lazy(() => import('@/pages/ordenador/OrdenadorTimelineDetailPage'))
const GestorTimelineDetailPage = lazy(() => import('@/pages/GestorTimelineDetailPage'))
const OrdenadorArquivadosPage = lazy(() => import('@/pages/ordenador/OrdenadorArquivadosPage'))
const FinanceiroArquivadosPage = lazy(() => import('@/pages/financeiro/FinanceiroArquivadosPage'))
const FinanceiroPagamentosPage = lazy(() => import('@/pages/financeiro/FinanceiroPagamentosPage'))
const FinanceiroPagamentoDetailPage = lazy(() => import('@/pages/financeiro/FinanceiroPagamentoDetailPage'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
    </RouteErrorBoundary>
  )
}

export function AppRoutes() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <GuestRoute portal="gestor">
                <LazyPage>
                  <LoginGestorPage />
                </LazyPage>
              </GuestRoute>
            }
          />
          <Route
            path="/clinica/login"
            element={<Navigate to="/clinica/timeline" replace />}
          />
          <Route
            path="/ordenador/login"
            element={<Navigate to="/clinica/timeline" replace />}
          />
          <Route
            path="/financeiro/login"
            element={<Navigate to="/clinica/timeline" replace />}
          />
        </Route>

        {/* Entrada pública — sempre abre o modal de perfil + senha */}
        <Route
          path="/clinica/timeline"
          element={
            <LazyPage>
              <TimelineEntryPage />
            </LazyPage>
          }
        />
        <Route
          path="/clinica/timeline/"
          element={
            <LazyPage>
              <TimelineEntryPage />
            </LazyPage>
          }
        />

        {/* Portal do Gestor — acesso total */}
        <Route
          element={
            <GestorProtectedRoute>
              <MainLayout />
            </GestorProtectedRoute>
          }
        >
          <Route path="/gestor" element={<Navigate to="/gestor/dashboard" replace />} />
          <Route path="/gestor/dashboard" element={<LazyPage><DashboardPage /></LazyPage>} />
          <Route path="/gestor/processos" element={<LazyPage><ProcessosPage /></LazyPage>} />
          <Route path="/gestor/processos/:id" element={<LazyPage><ProcessoDetailPage /></LazyPage>} />
          <Route path="/gestor/cadastros" element={<LazyPage><CadastrosPage /></LazyPage>} />
          <Route path="/gestor/workflow" element={<Navigate to="/gestor/dashboard" replace />} />
          <Route path="/gestor/historico" element={<LazyPage><HistoricoPage /></LazyPage>} />
          <Route path="/gestor/relatorios" element={<LazyPage><RelatoriosPage /></LazyPage>} />
          <Route path="/gestor/configuracao" element={<LazyPage><ConfiguracaoPage /></LazyPage>} />
          <Route path="/gestor/reversoes" element={<LazyPage><GestorReversoesPage /></LazyPage>} />
          <Route path="/gestor/timeline" element={<LazyPage><GestorTimelinesPage /></LazyPage>} />
          <Route path="/gestor/timeline/:id" element={<LazyPage><GestorTimelineDetailPage /></LazyPage>} />
          <Route path="/gestor/arquivados" element={<LazyPage><GestorArquivadosPage /></LazyPage>} />
        </Route>

        {/* Demonstração da Timeline — abre em nova aba */}
        <Route
          element={
            <GestorProtectedRoute>
              <Outlet />
            </GestorProtectedRoute>
          }
        >
          <Route
            path="/gestor/demo/entrar"
            element={
              <LazyPage>
                <DemoEntryPage />
              </LazyPage>
            }
          />
          <Route element={<GestorDemoShell />}>
            <Route
              element={
                <ClinicaProtectedRoute>
                  <ClinicaLayout />
                </ClinicaProtectedRoute>
              }
            >
            <Route path="/gestor/demo/clinica/timelines" element={<LazyPage><ClinicaTimelinePage /></LazyPage>} />
            <Route path="/gestor/demo/clinica/pedidos" element={<LazyPage><ClinicaPedidosPage /></LazyPage>} />
            <Route path="/gestor/demo/clinica/pedidos/novo" element={<LazyPage><ClinicaNovoPedidoPage /></LazyPage>} />
            <Route path="/gestor/demo/clinica/timeline/:id" element={<LazyPage><ClinicaTimelineDetailPage /></LazyPage>} />
            <Route path="/gestor/demo/clinica/pedidos/:id" element={<LazyPage><ClinicaPedidoDetailPage /></LazyPage>} />
          </Route>

          <Route
            element={
              <OrdenadorProtectedRoute>
                <OrdenadorLayout />
              </OrdenadorProtectedRoute>
            }
          >
            <Route path="/gestor/demo/ordenador/timelines" element={<LazyPage><OrdenadorTimelinesPage /></LazyPage>} />
            <Route path="/gestor/demo/ordenador/timelines/:id" element={<LazyPage><OrdenadorTimelineDetailPage /></LazyPage>} />
            <Route path="/gestor/demo/ordenador/arquivados" element={<LazyPage><OrdenadorArquivadosPage /></LazyPage>} />
          </Route>

          <Route
            element={
              <FinanceiroProtectedRoute>
                <FinanceiroLayout />
              </FinanceiroProtectedRoute>
            }
          >
            <Route path="/gestor/demo/financeiro/pagamentos" element={<LazyPage><FinanceiroPagamentosPage /></LazyPage>} />
            <Route path="/gestor/demo/financeiro/pagamentos/:id" element={<LazyPage><FinanceiroPagamentoDetailPage /></LazyPage>} />
            <Route path="/gestor/demo/financeiro/arquivados" element={<LazyPage><FinanceiroArquivadosPage /></LazyPage>} />
          </Route>
          </Route>
        </Route>

        {/* Portal da Clínica — somente pedidos próprios */}
        <Route
          element={
            <ClinicaProtectedRoute>
              <ClinicaLayout />
            </ClinicaProtectedRoute>
          }
        >
          <Route path="/clinica" element={<Navigate to="/clinica/timelines" replace />} />
          <Route path="/clinica/timelines" element={<LazyPage><ClinicaTimelinePage /></LazyPage>} />
          <Route path="/clinica/pedidos" element={<LazyPage><ClinicaPedidosPage /></LazyPage>} />
          <Route path="/clinica/pedidos/novo" element={<LazyPage><ClinicaNovoPedidoPage /></LazyPage>} />
          <Route path="/clinica/timeline/:id" element={<LazyPage><ClinicaTimelineDetailPage /></LazyPage>} />
          <Route path="/clinica/pedidos/:id" element={<LazyPage><ClinicaPedidoDetailPage /></LazyPage>} />
        </Route>

        {/* Portal do Ordenador de Despesa */}
        <Route
          element={
            <OrdenadorProtectedRoute>
              <OrdenadorLayout />
            </OrdenadorProtectedRoute>
          }
        >
          <Route path="/ordenador" element={<Navigate to="/ordenador/timelines" replace />} />
          <Route path="/ordenador/timelines" element={<LazyPage><OrdenadorTimelinesPage /></LazyPage>} />
          <Route path="/ordenador/timelines/:id" element={<LazyPage><OrdenadorTimelineDetailPage /></LazyPage>} />
          <Route path="/ordenador/arquivados" element={<LazyPage><OrdenadorArquivadosPage /></LazyPage>} />
        </Route>

        {/* Portal do Financeiro */}
        <Route
          element={
            <FinanceiroProtectedRoute>
              <FinanceiroLayout />
            </FinanceiroProtectedRoute>
          }
        >
          <Route path="/financeiro" element={<Navigate to="/financeiro/pagamentos" replace />} />
          <Route path="/financeiro/pagamentos" element={<LazyPage><FinanceiroPagamentosPage /></LazyPage>} />
          <Route path="/financeiro/pagamentos/:id" element={<LazyPage><FinanceiroPagamentoDetailPage /></LazyPage>} />
          <Route path="/financeiro/arquivados" element={<LazyPage><FinanceiroArquivadosPage /></LazyPage>} />
        </Route>

        {/* Rotas legadas */}
        <Route path="/dashboard" element={<Navigate to="/gestor/dashboard" replace />} />
        <Route path="/processos" element={<Navigate to="/gestor/processos" replace />} />
        <Route path="/processos/:id" element={<Navigate to="/gestor/processos" replace />} />
        <Route path="/cadastros" element={<Navigate to="/gestor/cadastros" replace />} />
        <Route path="/workflow" element={<Navigate to="/gestor/dashboard" replace />} />
        <Route path="/configuracao" element={<Navigate to="/gestor/dashboard" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
