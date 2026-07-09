import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, User, FileText, FolderOpen, Clock3, ShieldCheck } from 'lucide-react'
import type { TimelineDrawerDetail } from './types'
import { TimelineStatus } from './TimelineStatus'
import { timelineTheme } from './theme'
import { formatDateTime } from '@/utils/format'

interface TimelineDrawerProps {
  detail: TimelineDrawerDetail | null
  onClose: () => void
  actions?: React.ReactNode
}

export const TimelineDrawer = memo(function TimelineDrawer({
  detail,
  onClose,
  actions,
}: TimelineDrawerProps) {
  const historico = detail?.node.historico

  return (
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

              {actions && (
                <section style={{ marginBottom: 22 }}>
                  <div className="timeline-actions-slot">{actions}</div>
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
                {historico?.observacao ?? 'Sem observações registradas.'}
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

              <Section title="Comentários" icon={FileText}>
                <span style={{ color: timelineTheme.textSecondary, fontSize: '0.85rem' }}>
                  Nenhum comentário registrado nesta etapa.
                </span>
              </Section>

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
  )
})

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof User
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h3
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: '0 0 10px',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: timelineTheme.textSecondary,
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
