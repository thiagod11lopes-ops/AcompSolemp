import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { ClinicaLayout } from '@/layouts/ClinicaLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { GestorProtectedRoute, ClinicaProtectedRoute, OrdenadorProtectedRoute, FinanceiroProtectedRoute, GuestRoute } from '@/routes/PortalRoutes'
import { OrdenadorLayout } from '@/layouts/OrdenadorLayout'
import { FinanceiroLayout } from '@/layouts/FinanceiroLayout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'

function HomeRedirect() {
  const { gestorUser, clinicaUser, ordenadorUser, financeiroUser } = useAuth()
  if (gestorUser) return <Navigate to="/gestor/dashboard" replace />
  if (financeiroUser) return <Navigate to="/financeiro/pagamentos" replace />
  if (ordenadorUser) return <Navigate to="/ordenador/timelines" replace />
  if (clinicaUser) return <Navigate to="/clinica/timeline" replace />
  return <Navigate to="/login" replace />
}

const LoginGestorPage = lazy(() => import('@/pages/LoginGestorPage'))
const TimelineEntryPage = lazy(() => import('@/pages/clinica/TimelineEntryPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ProcessosPage = lazy(() => import('@/pages/ProcessosPage'))
const ProcessoDetailPage = lazy(() => import('@/pages/ProcessoDetailPage'))
const CadastrosPage = lazy(() => import('@/pages/CadastrosPage'))
const WorkflowPage = lazy(() => import('@/pages/WorkflowPage'))
const HistoricoPage = lazy(() => import('@/pages/HistoricoPage'))
const RelatoriosPage = lazy(() => import('@/pages/RelatoriosPage'))
const GestorReversoesPage = lazy(() => import('@/pages/GestorReversoesPage'))
const ConfiguracaoPage = lazy(() => import('@/pages/ConfiguracaoPage'))
const ClinicaPedidosPage = lazy(() => import('@/pages/clinica/ClinicaPedidosPage'))
const ClinicaNovoPedidoPage = lazy(() => import('@/pages/clinica/ClinicaNovoPedidoPage'))
const ClinicaTimelineDetailPage = lazy(() => import('@/pages/clinica/ClinicaTimelineDetailPage'))
const ClinicaPedidoDetailPage = lazy(() => import('@/pages/clinica/ClinicaPedidoDetailPage'))
const OrdenadorTimelinesPage = lazy(() => import('@/pages/ordenador/OrdenadorTimelinesPage'))
const OrdenadorTimelineDetailPage = lazy(() => import('@/pages/ordenador/OrdenadorTimelineDetailPage'))
const FinanceiroPagamentosPage = lazy(() => import('@/pages/financeiro/FinanceiroPagamentosPage'))
const FinanceiroPagamentoDetailPage = lazy(() => import('@/pages/financeiro/FinanceiroPagamentoDetailPage'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
}

export function AppRoutes() {
  return (
    <BrowserRouter>
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

        {/* Entrada pública — modal Clínica / Ordenador / Financeiro */}
        <Route
          path="/clinica/timeline"
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
          <Route path="/gestor/workflow" element={<LazyPage><WorkflowPage /></LazyPage>} />
          <Route path="/gestor/historico" element={<LazyPage><HistoricoPage /></LazyPage>} />
          <Route path="/gestor/relatorios" element={<LazyPage><RelatoriosPage /></LazyPage>} />
          <Route path="/gestor/configuracao" element={<LazyPage><ConfiguracaoPage /></LazyPage>} />
          <Route path="/gestor/reversoes" element={<LazyPage><GestorReversoesPage /></LazyPage>} />
        </Route>

        {/* Portal da Clínica — somente pedidos próprios */}
        <Route
          element={
            <ClinicaProtectedRoute>
              <ClinicaLayout />
            </ClinicaProtectedRoute>
          }
        >
          <Route path="/clinica" element={<Navigate to="/clinica/pedidos" replace />} />
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
        </Route>

        {/* Rotas legadas */}
        <Route path="/dashboard" element={<Navigate to="/gestor/dashboard" replace />} />
        <Route path="/processos" element={<Navigate to="/gestor/processos" replace />} />
        <Route path="/processos/:id" element={<Navigate to="/gestor/processos" replace />} />
        <Route path="/cadastros" element={<Navigate to="/gestor/cadastros" replace />} />
        <Route path="/workflow" element={<Navigate to="/gestor/workflow" replace />} />
        <Route path="/configuracao" element={<Navigate to="/gestor/workflow?tab=prazos" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
