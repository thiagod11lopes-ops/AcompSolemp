import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check, Eye, Inbox, Paperclip, Send } from 'lucide-react'

interface PlanilhaFlowActionsProps {
  recebida: boolean
  onReceber: () => void
  onEnviar: () => void
  disabled?: boolean
  receberDisabled?: boolean
  enviarDisabled?: boolean
  tituloBloqueado?: string
  /** Contagem de anexos do processo (exibida no botão). */
  anexosCount?: number
  onAbrirAnexos?: () => void
  onVisualizarDocumento?: () => void
}

type PlanilhaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: 'receive' | 'receive-done' | 'send' | 'anexo' | 'preview'
}

function PlanilhaButton({ tone, className, children, ...props }: PlanilhaButtonProps) {
  return (
    <button
      type="button"
      className={`planilha-flow-btn planilha-flow-btn--${tone}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

/** Painel moderno: Receber / Enviar planilha + arquivo anexado. */
export function PlanilhaFlowActions({
  recebida,
  onReceber,
  onEnviar,
  disabled = false,
  receberDisabled = false,
  enviarDisabled = false,
  tituloBloqueado = 'Receba a planilha primeiro — clique em Receber planilha para liberar o envio',
  anexosCount,
  onAbrirAnexos,
  onVisualizarDocumento,
}: PlanilhaFlowActionsProps) {
  const receberOff = disabled || receberDisabled
  const enviarOff = disabled || enviarDisabled || !recebida
  const mostrarAnexos = typeof anexosCount === 'number' && Boolean(onAbrirAnexos)
  const temAnexo = (anexosCount ?? 0) > 0

  return (
    <div className="planilha-flow-panel" role="group" aria-label="Ações da planilha">
      <div className="planilha-flow-panel__head">
        <span className="planilha-flow-panel__eyebrow">Ações da etapa</span>
        <strong className="planilha-flow-panel__title">Planilha e anexos</strong>
        <p className="planilha-flow-panel__hint">
          {recebida
            ? 'Planilha recebida — você já pode enviar para a próxima etapa.'
            : '1º Receber planilha · 2º Conferir anexos · 3º Enviar planilha'}
        </p>
      </div>

      <div className="planilha-flow-actions">
        <PlanilhaButton
          tone={recebida ? 'receive-done' : 'receive'}
          onClick={onReceber}
          disabled={receberOff || recebida}
          aria-pressed={recebida}
          title={recebida ? 'Planilha recebida' : 'Receber planilha'}
        >
          <span className="planilha-flow-btn__icon" aria-hidden>
            {recebida ? (
              <Check size={15} strokeWidth={2.4} />
            ) : (
              <Inbox size={15} strokeWidth={2.2} />
            )}
          </span>
          <span>{recebida ? 'Recebida' : 'Receber planilha'}</span>
        </PlanilhaButton>

        <PlanilhaButton
          tone="send"
          onClick={onEnviar}
          disabled={enviarOff}
          title={enviarOff && !recebida ? tituloBloqueado : 'Enviar planilha'}
        >
          <span className="planilha-flow-btn__icon" aria-hidden>
            <Send size={15} strokeWidth={2.2} />
          </span>
          <span>Enviar planilha</span>
        </PlanilhaButton>
      </div>

      {mostrarAnexos && (
        <div className="planilha-flow-anexos">
          <PlanilhaButton
            tone="anexo"
            data-keep-drawer=""
            onClick={onAbrirAnexos}
            title={
              temAnexo
                ? `${anexosCount} arquivo(s) anexado(s)`
                : 'Nenhum arquivo anexado — abrir pasta'
            }
          >
            <span className="planilha-flow-btn__icon" aria-hidden>
              <Paperclip size={15} strokeWidth={2.2} />
            </span>
            <span className="planilha-flow-btn__label">
              {temAnexo ? 'Arquivo anexado' : 'Sem anexos'}
            </span>
            <span
              className={`planilha-flow-badge${temAnexo ? ' planilha-flow-badge--active' : ''}`}
            >
              {anexosCount}
            </span>
          </PlanilhaButton>

          {onVisualizarDocumento && (
            <PlanilhaButton
              tone="preview"
              data-keep-drawer=""
              onClick={onVisualizarDocumento}
              disabled={!temAnexo}
              aria-label="Visualizar documento"
              title={temAnexo ? 'Visualizar documento' : 'Nenhum documento para visualizar'}
            >
              <span className="planilha-flow-btn__icon" aria-hidden>
                <Eye size={15} strokeWidth={2.2} />
              </span>
              <span>Ver</span>
            </PlanilhaButton>
          )}
        </div>
      )}
    </div>
  )
}

export type { PlanilhaFlowActionsProps }

/** Utilitário para envolver conteúdo extra no painel, se necessário. */
export function PlanilhaFlowSlot({ children }: { children: ReactNode }) {
  return <div className="planilha-flow-slot">{children}</div>
}
