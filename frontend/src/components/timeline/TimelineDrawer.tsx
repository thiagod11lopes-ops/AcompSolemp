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
import {
  listComentariosTimeline,
  pedidoPlanilhaEnvioService,
} from '@/services/pedidoPlanilhaEnvioService'
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
const WHITE_SOFT = 'rgba(255,255,255,0.55)'
const LINE = 'rgba(255,255,255,0.1)'
const SURFACE = 'rgba(255,255,255,0.04)'

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

  const comentariosTimeline = listComentariosTimeline(planilhaEnvio)
  const COR_COMENTARIO = '#fb923c'

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

  const historicoEtapa =
    detail?.pedido.etapasHistorico.filter(
      (h) => h.etapaId === detail.node.etapa.id || h.etapaNome === detail.node.etapa.nome,
    ) ?? []

  return (
    <>
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(8,10,12,0.48)',
                backdropFilter: 'blur(6px)',
                zIndex: 1300,
              }}
            />
            <motion.aside
              initial={{ x: '100%', opacity: 0.85 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.85 }}
              transition={{ type: 'spring', damping: 32, stiffness: 380 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: 'min(400px, 100vw)',
                height: '100vh',
                background: `
                  linear-gradient(180deg, rgba(85,139,113,0.16) 0%, transparent 180px),
                  ${timelineTheme.card}
                `,
                borderLeft: `1px solid ${LINE}`,
                zIndex: 1301,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-12px 0 40px rgba(0,0,0,0.28)',
                color: WHITE,
              }}
            >
              <header
                style={{
                  padding: '20px 22px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 99,
                        background: timelineTheme.blue,
                        boxShadow: `0 0 0 3px rgba(85,139,113,0.22)`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.68rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: WHITE_SOFT,
                      }}
                    >
                      Etapa
                    </span>
                  </div>
                  <h2
                    style={{
                      margin: '0 0 12px',
                      fontSize: '1.4rem',
                      fontWeight: 750,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.15,
                      color: WHITE,
                    }}
                  >
                    {detail.node.displayName}
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div className="timeline-drawer-status-white">
                      <TimelineStatus status={detail.node.status} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: WHITE,
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: SURFACE,
                        border: `1px solid ${LINE}`,
                      }}
                    >
                      PED {detail.node.numeroPedido}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  title="Fechar painel"
                  style={{
                    border: `1px solid ${LINE}`,
                    background: SURFACE,
                    borderRadius: 12,
                    width: 34,
                    height: 34,
                    display: 'grid',
                    placeItems: 'center',
                    color: WHITE,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </header>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '4px 22px 28px',
                  color: WHITE,
                }}
              >
                {(podeVerPlanilha || actions) && (
                  <div
                    className="timeline-drawer-actions-white"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 22,
                      padding: '12px',
                      borderRadius: 14,
                      background: SURFACE,
                      border: `1px solid ${LINE}`,
                    }}
                    onClick={(event) => {
                      const target = event.target
                      if (!(target instanceof Element)) return
                      const button = target.closest('button')
                      if (!button || button.disabled) return
                      if (button.hasAttribute('data-keep-drawer')) return
                      onClose()
                    }}
                  >
                    {podeVerPlanilha ? (
                      <TimelineActionButton onClick={handleVerPlanilha} variant="ghost">
                        Ver planilha
                      </TimelineActionButton>
                    ) : null}
                    {actions}
                  </div>
                )}

                <MetaBlock
                  items={[
                    { icon: User, label: 'Responsável', value: responsavelNome },
                    ...(historico
                      ? [
                          {
                            icon: Clock3,
                            label: 'Início',
                            value: formatDateTime(historico.dataInicio),
                          },
                          ...(historico.dataConclusao
                            ? [
                                {
                                  icon: Clock3,
                                  label: 'Conclusão',
                                  value: formatDateTime(historico.dataConclusao),
                                },
                              ]
                            : []),
                          ...(detail.node.tempoNaEtapa
                            ? [
                                {
                                  icon: Clock3,
                                  label: 'Tempo na etapa',
                                  value: detail.node.tempoNaEtapa,
                                },
                              ]
                            : []),
                          {
                            icon: Clock3,
                            label: 'Prazo da etapa',
                            value: `${detail.node.etapa.prazoDias} dias`,
                          },
                        ]
                      : [
                          {
                            icon: Clock3,
                            label: 'Prazo da etapa',
                            value: `${detail.node.etapa.prazoDias} dias`,
                          },
                        ]),
                  ]}
                />

                {!historico && (
                  <p
                    style={{
                      margin: '0 0 18px',
                      color: WHITE_SOFT,
                      fontSize: '0.82rem',
                    }}
                  >
                    Etapa ainda não iniciada
                  </p>
                )}

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
                    <span style={{ color: WHITE_SOFT, fontSize: '0.85rem' }}>
                      Justificativa não registrada.
                    </span>
                  ) : comentariosTimeline.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {comentariosTimeline.map((item) => (
                        <div key={item.id}>
                          <div
                            style={{
                              color: WHITE,
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              marginBottom: 4,
                              letterSpacing: '0.01em',
                            }}
                          >
                            {item.responsavelNome}
                            {item.etapaNome ? (
                              <span
                                style={{
                                  color: WHITE_SOFT,
                                  fontWeight: 500,
                                  marginLeft: 6,
                                }}
                              >
                                · {item.etapaNome}
                              </span>
                            ) : null}
                          </div>
                          <p
                            style={{
                              margin: 0,
                              color: COR_COMENTARIO,
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              lineHeight: 1.55,
                            }}
                          >
                            {item.texto}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: WHITE_SOFT, fontSize: '0.85rem' }}>
                      Nenhum comentário registrado neste processo.
                    </span>
                  )}
                  {isDevolvido && podeCorrigir && corrigirPath ? (
                    <div style={{ marginTop: 12 }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {devolucoesOrdenadas.map((item, index) => {
                        const isLatest = index === 0
                        return (
                          <div
                            key={item.id}
                            style={{
                              padding: '12px 13px',
                              borderRadius: 12,
                              border: `1px solid ${
                                isLatest ? 'rgba(251, 146, 60, 0.4)' : LINE
                              }`,
                              background: isLatest
                                ? 'rgba(251, 146, 60, 0.1)'
                                : SURFACE,
                              fontSize: '0.84rem',
                              lineHeight: 1.5,
                              color: WHITE,
                            }}
                          >
                            <div
                              style={{
                                color: WHITE_SOFT,
                                fontSize: '0.72rem',
                                marginBottom: 6,
                                fontWeight: 600,
                              }}
                            >
                              {formatDateTime(item.em)}
                              {isLatest ? ' · mais recente' : ''}
                            </div>
                            <div style={{ marginBottom: 4 }}>
                              <strong>{item.deEtapaNome}</strong>
                              {' → '}
                              <strong>{item.paraEtapaNome}</strong>
                            </div>
                            <div style={{ color: WHITE_SOFT, marginBottom: 6 }}>
                              Por {item.porUsuarioNome}
                            </div>
                            <div
                              style={{
                                color: isLatest ? corDevolvido : WHITE,
                                fontWeight: 600,
                              }}
                            >
                              {item.justificativa}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Section>
                )}

                {historicoEtapa.length > 0 && (
                  <Section title="Histórico" icon={Clock3}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {historicoEtapa.map((h, index) => (
                        <div
                          key={`${h.etapaId}-${index}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '9px 12px',
                            borderRadius: 10,
                            background: SURFACE,
                            border: `1px solid ${LINE}`,
                            fontSize: '0.8rem',
                            color: WHITE,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 99,
                              background: h.dataConclusao
                                ? timelineTheme.green
                                : timelineTheme.blue,
                              flexShrink: 0,
                            }}
                          />
                          <span>
                            {formatDateTime(h.dataInicio)}
                            {h.dataConclusao
                              ? ` → ${formatDateTime(h.dataConclusao)}`
                              : ' · em aberto'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title="Processo" icon={FileText}>
                  <MetaBlock
                    compact
                    items={[
                      {
                        icon: FileText,
                        label: 'Clínica',
                        value: detail.pedido.clinica.nome,
                      },
                      {
                        icon: FileText,
                        label: 'Empresa',
                        value: detail.pedido.empresa.nomeFantasia,
                      },
                      {
                        icon: FileText,
                        label: 'Material',
                        value: detail.pedido.material.descricao,
                      },
                      {
                        icon: FileText,
                        label: 'Valor',
                        value: formatCurrency(detail.pedido.valor),
                      },
                    ]}
                  />
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
          border-color: ${LINE} !important;
          background: ${SURFACE} !important;
        }
        .timeline-drawer-actions-white button {
          color: ${WHITE} !important;
          border-color: ${LINE} !important;
          background: rgba(255,255,255,0.03) !important;
          border-radius: 10px !important;
        }
        .timeline-drawer-actions-white button:hover:not(:disabled) {
          background: rgba(255,255,255,0.08) !important;
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
          gap: 7,
          margin: '0 0 10px',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: WHITE_SOFT,
          fontWeight: 700,
        }}
      >
        <Icon size={13} color={WHITE_SOFT} />
        {title}
      </h3>
      <div style={{ fontSize: '0.88rem', lineHeight: 1.5, color: WHITE }}>{children}</div>
    </section>
  )
}

function MetaBlock({
  items,
  compact = false,
}: {
  items: Array<{ icon: typeof User; label: string; value: string }>
  compact?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: compact ? 0 : 2,
        marginBottom: compact ? 0 : 18,
        borderRadius: compact ? 0 : 14,
        border: compact ? 'none' : `1px solid ${LINE}`,
        background: compact ? 'transparent' : SURFACE,
        overflow: 'hidden',
      }}
    >
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <div
            key={`${item.label}-${index}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '18px 1fr auto',
              alignItems: 'start',
              gap: 10,
              padding: compact ? '7px 0' : '11px 13px',
              borderTop: compact
                ? index === 0
                  ? 'none'
                  : `1px solid ${LINE}`
                : index === 0
                  ? 'none'
                  : `1px solid ${LINE}`,
            }}
          >
            <Icon size={14} color={WHITE_SOFT} style={{ marginTop: 2 }} />
            <span style={{ color: WHITE_SOFT, fontSize: '0.78rem' }}>{item.label}</span>
            <span
              style={{
                color: WHITE,
                fontSize: '0.84rem',
                fontWeight: 600,
                textAlign: 'right',
                lineHeight: 1.35,
                maxWidth: 210,
                wordBreak: 'break-word',
              }}
            >
              {item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
