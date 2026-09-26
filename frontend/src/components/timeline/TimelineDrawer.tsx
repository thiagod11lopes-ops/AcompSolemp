import { memo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, User, FileText, FolderOpen, Clock3, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TimelineDrawerDetail } from './types'
import { TimelineStatus } from './TimelineStatus'
import { TimelineActionButton } from './TimelineActionButton'
import { timelineTheme } from './theme'
import { formatDateTime } from '@/utils/format'
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
  const corDevolvido = '#c2410c'
  const devolucoes = detail?.pedido.planilhaDevolucoes ?? []
  const devolucoesOrdenadas = [...devolucoes].sort(
    (a, b) => new Date(b.em).getTime() - new Date(a.em).getTime(),
  )

  const planilhaEnvio = detail
    ? pedidoPlanilhaEnvioService.getForPedido(detail.pedido.id)
    : null
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
            }}
          >
            <header
              style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${timelineTheme.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: timelineTheme.textSecondary }}>
                  Detalhes da etapa
                </p>
                <h2 style={{ margin: '6px 0 10px', fontSize: '1.15rem', fontWeight: 700 }}>
                  {detail.node.displayName}
                </h2>
                <TimelineStatus status={detail.node.status} />
              </div>
              <button
                type="button"
                onClick={onClose}
                title="Fechar painel"
                style={{
                  border: `1px solid ${timelineTheme.border}`,
                  background: 'transparent',
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  color: timelineTheme.text,
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
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
                    className="timeline-actions-slot"
                    // Bubble (não capture): o onClick do botão precisa rodar antes de fechar o drawer.
                    onClick={(event) => {
                      const target = event.target
                      if (!(target instanceof Element)) return
                      const button = target.closest('button')
                      if (!button || button.disabled) return
                      // Mantém o drawer aberto para ações que abrem outro modal (ex.: anexos).
                      if (button.hasAttribute('data-keep-drawer')) return
                      onClose()
                    }}
                  >
                    {actions}
                  </div>
                </section>
              )}

              <Section title="Responsável" icon={User}>
                {historico?.responsavelNome ?? 'Não atribuído'}
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
                  </>
                ) : (
                  <p style={{ margin: 0, color: timelineTheme.textSecondary, fontSize: '0.85rem' }}>
                    Etapa ainda não iniciada
                  </p>
                )}
              </Section>

              {detail.node.processoNumero && (
                <Section title="Número do processo" icon={FileText}>
                  {detail.node.processoNumero}
                </Section>
              )}

              <Section title="Observações" icon={FileText}>
                {isDevolvido ? (
                  <span style={{ color: timelineTheme.textSecondary, fontSize: '0.85rem' }}>
                    Sem observações adicionais nesta etapa.
                  </span>
                ) : (
                  historico?.observacao ?? 'Sem observações registradas.'
                )}
              </Section>

              <Section title="Arquivos" icon={FolderOpen}>
                {historico?.arquivos?.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem' }}>
                    {historico.arquivos.map((arquivo) => (
                      <li key={arquivo}>{arquivo}</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: timelineTheme.textSecondary, fontSize: '0.85rem' }}>
                    Nenhum arquivo anexado nesta etapa.
                  </span>
                )}
              </Section>

              <Section
                title={isDevolvido ? 'Justificativa da devolução' : 'Comentários'}
                icon={FileText}
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
                  <span style={{ color: timelineTheme.textSecondary, fontSize: '0.85rem' }}>
                    Justificativa não registrada.
                  </span>
                ) : (
                  <span style={{ color: timelineTheme.textSecondary, fontSize: '0.85rem' }}>
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
                              isLatest ? 'rgba(194, 65, 12, 0.45)' : timelineTheme.border
                            }`,
                            background: isLatest ? 'rgba(194, 65, 12, 0.08)' : 'transparent',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                          }}
                        >
                          <div
                            style={{
                              color: timelineTheme.textSecondary,
                              fontSize: '0.75rem',
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
                          <div style={{ color: timelineTheme.textSecondary, marginBottom: 8 }}>
                            Por {item.porUsuarioNome}
                          </div>
                          <div style={{ color: isLatest ? corDevolvido : undefined, fontWeight: 600 }}>
                            {item.justificativa}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Section>
              )}

              <Section title="Alterações" icon={Clock3}>
                {historico?.observacao ? (
                  <div style={{ fontSize: '0.85rem' }}>{historico.observacao}</div>
                ) : (
                  <span style={{ color: timelineTheme.textSecondary, fontSize: '0.85rem' }}>
                    Sem alterações documentadas.
                  </span>
                )}
              </Section>

              <Section title="Auditoria" icon={ShieldCheck}>
                <Row label="Pedido" value={detail.node.numeroPedido} />
                <Row label="Clínica" value={detail.pedido.clinica.nome} />
                <Row label="Empresa" value={detail.pedido.empresa.nomeFantasia} />
                <Row label="Prazo da etapa" value={`${detail.node.etapa.prazoDias} dias`} />
              </Section>

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
                        border: `1px solid ${timelineTheme.border}`,
                        marginBottom: 8,
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ color: timelineTheme.textSecondary, marginBottom: 4 }}>
                        {formatDateTime(h.dataInicio)}
                        {h.dataConclusao ? ` → ${formatDateTime(h.dataConclusao)}` : ' (em aberto)'}
                      </div>
                      {h.observacao && <div>{h.observacao}</div>}
                    </div>
                  ))}
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
    <section style={{ marginBottom: 22 }}>
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
          ...(titleClassName ? {} : { color: timelineTheme.textSecondary }),
          fontWeight: 700,
        }}
      >
        <Icon size={14} />
        {title}
      </h3>
      <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
      <span style={{ color: timelineTheme.textSecondary }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
