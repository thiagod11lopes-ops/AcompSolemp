import { memo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, User, FileText, Clock3, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TimelineDrawerDetail } from './types'
import { TimelineStatus } from './TimelineStatus'
import { TimelineActionButton } from './TimelineActionButton'
import { timelineTheme } from './theme'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useAuth } from '@/contexts/AuthContext'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import {
  buildCorrigirDevolucaoPath,
  usuarioPodeCorrigirDevolucao,
} from '@/utils/corrigirDevolucao'
import { AuditoriaPlanilhaModal } from '@/components/ordenador/AuditoriaPlanilhaModal'
import type { PedidoPlanilhaEnvioState } from '@/types'

interface TimelineDrawerProps {
  detail: TimelineDrawerDetail | null
  onClose: () => void
  actions?: React.ReactNode
}

const WHITE = '#FFFFFF'
const WHITE_MUTED = 'rgba(255,255,255,0.78)'
const WHITE_SOFT = 'rgba(255,255,255,0.14)'

function resolvePreferFormatoPlanilha(
  planilha: PedidoPlanilhaEnvioState | null,
): 'imh' | 'divMaterial' | 'controleSolemp' {
  if (!planilha) return 'imh'
  if (
    planilha.imhAbaLinhas?.length ||
    planilha.imhMedicamentoLinhas?.length ||
    planilha.linhas?.length
  ) {
    return 'imh'
  }
  if (planilha.divMaterialLinhas?.length) return 'divMaterial'
  if (planilha.controleSolempLinhas?.length) return 'controleSolemp'
  return 'imh'
}

export const TimelineDrawer = memo(function TimelineDrawer({
  detail,
  onClose,
  actions,
}: TimelineDrawerProps) {
  const navigate = useNavigate()
  const { mapPath } = usePortalPaths()
  const { gestorUser, clinicaUser, ordenadorUser, financeiroUser, demoMode } = useAuth()
  const authUser =
    demoMode?.authUser ?? clinicaUser ?? ordenadorUser ?? financeiroUser ?? gestorUser

  const historico = detail?.node.historico
  const isDevolvido = detail?.node.statusBand === 'devolvido'
  const justificativaDevolucao = detail?.node.justificativaDevolucao?.trim() || null
  const corDevolvido = '#fb923c'
  const devolucoes = detail?.pedido.planilhaDevolucoes ?? []
  const devolucoesOrdenadas = [...devolucoes].sort(
    (a, b) => new Date(b.em).getTime() - new Date(a.em).getTime(),
  )

  const planilhaEnvio = detail
    ? pedidoPlanilhaEnvioService.getForPedido(detail.pedido.id)
    : null

  const responsavelNome =
    historico?.responsavelNome?.trim() ||
    planilhaEnvio?.enviadoPorNome?.trim() ||
    detail?.pedido.etapasHistorico.find((h) => h.responsavelNome)?.responsavelNome ||
    'Não atribuído'

  const comentarioEnvio = planilhaEnvio?.comentarioEnvio?.trim() || ''

  const corrigirPath =
    detail && isDevolvido
      ? buildCorrigirDevolucaoPath(detail.pedido, planilhaEnvio)
      : null
  const podeCorrigir =
    detail && corrigirPath
      ? usuarioPodeCorrigirDevolucao(detail.pedido, detail.node, authUser)
      : false

  const isGestor =
    authUser?.perfil === 'GESTOR' || authUser?.perfil === 'ADMINISTRADOR'
  const podeVerPlanilha = Boolean(isGestor && planilhaEnvio)

  const [planilhaModal, setPlanilhaModal] = useState<{
    open: boolean
    pedidoNumero: string
    planilha: PedidoPlanilhaEnvioState | null
  }>({ open: false, pedidoNumero: '', planilha: null })

  const handleCorrigir = () => {
    if (!corrigirPath) return
    navigate(mapPath(corrigirPath))
    onClose()
  }

  const handleVerPlanilha = () => {
    if (!detail || !planilhaEnvio) return
    setPlanilhaModal({
      open: true,
      pedidoNumero: detail.pedido.numero,
      planilha: planilhaEnvio,
    })
  }

  return (
    <>
    <AnimatePresence>
      {detail && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              zIndex: 1300,
            }}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 'min(440px, 100vw)',
              height: '100vh',
              background: timelineTheme.card,
              borderLeft: `1px solid ${timelineTheme.border}`,
              zIndex: 1301,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-24px 0 64px rgba(0,0,0,0.5)',
              color: WHITE,
            }}
          >
            <header
              style={{
                padding: '22px 24px 18px',
                borderBottom: `1px solid ${WHITE_SOFT}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.68rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: WHITE,
                  }}
                >
                  Etapa
                </p>
                <h2
                  style={{
                    margin: '8px 0 12px',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    color: WHITE,
                  }}
                >
                  {detail.node.displayName}
                </h2>
                <div className="timeline-drawer-status-white">
                  <TimelineStatus status={detail.node.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                title="Fechar painel"
                style={{
                  border: `1px solid ${WHITE_SOFT}`,
                  background: 'transparent',
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  color: WHITE,
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', color: WHITE }}>
              <Section title="Pedido" icon={FileText}>
                PED {detail.node.numeroPedido}
              </Section>

              {podeVerPlanilha ? (
                <section style={{ marginBottom: 22 }}>
                  <TimelineActionButton onClick={handleVerPlanilha} variant="ghost">
                    Ver planilha
                  </TimelineActionButton>
                </section>
              ) : null}

              {actions && (
                <section style={{ marginBottom: 22 }}>
                  <div
                    className="timeline-actions-slot timeline-drawer-actions-white"
                    // Bubble (não capture): o onClick do botão precisa rodar antes de fechar o drawer.
                    onClick={(event) => {
                      const target = event.target
                      if (!(target instanceof Element)) return
                      const button = target.closest('button')
                      if (!button || button.disabled) return
                      // Mantém o drawer aberto para ações que abrem outro modal (ex.: anexos / enviar).
                      if (button.hasAttribute('data-keep-drawer')) return
                      onClose()
                    }}
                  >
                    {actions}
                  </div>
                </section>
              )}

              <Section title="Responsável" icon={User}>
                {responsavelNome}
              </Section>

              <Section title="Datas" icon={Clock3}>
                {historico ? (
                  <>
                    <Row label="Início" value={formatDateTime(historico.dataInicio)} />
                    {historico.dataConclusao && (
                      <Row label="Conclusão" value={formatDateTime(historico.dataConclusao)} />
                    )}
                    {detail.node.tempoNaEtapa && (
                      <Row label="Tempo na etapa" value={detail.node.tempoNaEtapa} />
                    )}
                    <Row
                      label="Prazo da etapa"
                      value={`${detail.node.etapa.prazoDias} dias`}
                    />
                  </>
                ) : (
                  <>
                    <p style={{ margin: '0 0 6px', color: WHITE, fontSize: '0.85rem' }}>
                      Etapa ainda não iniciada
                    </p>
                    <Row
                      label="Prazo da etapa"
                      value={`${detail.node.etapa.prazoDias} dias`}
                    />
                  </>
                )}
              </Section>

              <Section
                title={isDevolvido ? 'Justificativa da devolução' : 'Comentários'}
                icon={MessageSquare}
                titleClassName={
                  isDevolvido && justificativaDevolucao
                    ? 'timeline-drawer-devolucao-title-blink'
                    : undefined
                }
              >
                {isDevolvido && justificativaDevolucao ? (
                  <p
                    style={{
                      margin: 0,
                      color: corDevolvido,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      lineHeight: 1.55,
                    }}
                  >
                    {justificativaDevolucao}
                  </p>
                ) : isDevolvido ? (
                  <span style={{ color: WHITE, fontSize: '0.85rem' }}>
                    Justificativa não registrada.
                  </span>
                ) : comentarioEnvio ? (
                  <span style={{ color: WHITE, fontSize: '0.9rem', lineHeight: 1.55 }}>
                    {comentarioEnvio}
                  </span>
                ) : (
                  <span style={{ color: WHITE, fontSize: '0.85rem' }}>
                    Nenhum comentário registrado nesta etapa.
                  </span>
                )}
                {isDevolvido && podeCorrigir && corrigirPath ? (
                  <div style={{ marginTop: 14 }}>
                    <TimelineActionButton
                      onClick={handleCorrigir}
                      style={{
                        width: '100%',
                        background: corDevolvido,
                        color: '#fff',
                        border: 'none',
                        letterSpacing: '0.06em',
                      }}
                    >
                      CORRIGIR
                    </TimelineActionButton>
                  </div>
                ) : null}
              </Section>

              {devolucoesOrdenadas.length > 0 && (
                <Section title="Devoluções da planilha" icon={Clock3}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {devolucoesOrdenadas.map((item, index) => {
                      const isLatest = index === 0
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            border: `1px solid ${
                              isLatest ? 'rgba(251, 146, 60, 0.45)' : WHITE_SOFT
                            }`,
                            background: isLatest ? 'rgba(251, 146, 60, 0.12)' : 'transparent',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            color: WHITE,
                          }}
                        >
                          <div
                            style={{
                              color: WHITE_MUTED,
                              fontSize: '0.75rem',
                              marginBottom: 6,
                              fontWeight: 600,
                            }}
                          >
                            {formatDateTime(item.em)}
                            {isLatest ? ' · mais recente' : ''}
                          </div>
                          <div style={{ marginBottom: 4, color: WHITE }}>
                            <strong>{item.deEtapaNome}</strong>
                            {' → '}
                            <strong>{item.paraEtapaNome}</strong>
                          </div>
                          <div style={{ color: WHITE_MUTED, marginBottom: 8 }}>
                            Por {item.porUsuarioNome}
                          </div>
                          <div style={{ color: isLatest ? corDevolvido : WHITE, fontWeight: 600 }}>
                            {item.justificativa}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Section>
              )}

              <Section title="Histórico completo" icon={Clock3}>
                {detail.pedido.etapasHistorico
                  .filter(
                    (h) =>
                      h.etapaId === detail.node.etapa.id || h.etapaNome === detail.node.etapa.nome,
                  )
                  .map((h, index) => (
                    <div
                      key={`${h.etapaId}-${index}`}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: `1px solid ${WHITE_SOFT}`,
                        marginBottom: 8,
                        fontSize: '0.82rem',
                        color: WHITE,
                      }}
                    >
                      <div style={{ color: WHITE }}>
                        {formatDateTime(h.dataInicio)}
                        {h.dataConclusao ? ` → ${formatDateTime(h.dataConclusao)}` : ' (em aberto)'}
                      </div>
                    </div>
                  ))}
              </Section>

              <Section title="Dados do processo" icon={FileText}>
                <Row label="Clínica" value={detail.pedido.clinica.nome} />
                <Row label="Empresa" value={detail.pedido.empresa.nomeFantasia} />
                <Row label="Material" value={detail.pedido.material.descricao} />
                <Row label="Valor" value={formatCurrency(detail.pedido.valor)} />
              </Section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>

    <AuditoriaPlanilhaModal
      open={planilhaModal.open}
      pedidoNumero={planilhaModal.pedidoNumero}
      planilha={planilhaModal.planilha}
      preferFormato={resolvePreferFormatoPlanilha(planilhaModal.planilha)}
      title={
        planilhaModal.pedidoNumero
          ? `Planilha — ${planilhaModal.pedidoNumero}`
          : undefined
      }
      onClose={() =>
        setPlanilhaModal({ open: false, pedidoNumero: '', planilha: null })
      }
    />

    <style>{`
      .timeline-drawer-status-white span {
        color: ${WHITE} !important;
        border-color: ${WHITE_SOFT} !important;
        background: rgba(255,255,255,0.1) !important;
      }
      .timeline-drawer-actions-white button,
      .timeline-drawer-actions-white {
        color: ${WHITE} !important;
      }
    `}</style>
    </>
  )
})

function Section({
  title,
  icon: Icon,
  titleClassName,
  children,
}: {
  title: string
  icon: typeof User
  titleClassName?: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 22, color: WHITE }}>
      <h3
        className={titleClassName}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: '0 0 10px',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: WHITE,
          fontWeight: 700,
        }}
      >
        <Icon size={14} color={WHITE} />
        {title}
      </h3>
      <div style={{ fontSize: '0.88rem', lineHeight: 1.5, color: WHITE }}>{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 6,
        color: WHITE,
      }}
    >
      <span style={{ color: WHITE }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', color: WHITE }}>{value}</span>
    </div>
  )
}
