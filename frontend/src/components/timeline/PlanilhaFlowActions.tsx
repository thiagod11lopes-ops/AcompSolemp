import type { ButtonHTMLAttributes } from 'react'
import { Check, Inbox, Send } from 'lucide-react'

interface PlanilhaFlowActionsProps {
  recebida: boolean
  onReceber: () => void
  onEnviar: () => void
  disabled?: boolean
  receberDisabled?: boolean
  enviarDisabled?: boolean
  tituloBloqueado?: string
}

type PlanilhaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: 'receive' | 'receive-done' | 'send'
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

/** Par Receber / Enviar planilha — visual leve e moderno. */
export function PlanilhaFlowActions({
  recebida,
  onReceber,
  onEnviar,
  disabled = false,
  receberDisabled = false,
  enviarDisabled = false,
  tituloBloqueado = 'Receba a planilha primeiro — clique em Receber planilha para liberar o envio',
}: PlanilhaFlowActionsProps) {
  const receberOff = disabled || receberDisabled
  const enviarOff = disabled || enviarDisabled || !recebida

  return (
    <div className="planilha-flow-actions" role="group" aria-label="Ações da planilha">
      <PlanilhaButton
        tone={recebida ? 'receive-done' : 'receive'}
        onClick={onReceber}
        disabled={receberOff || recebida}
        aria-pressed={recebida}
        title={recebida ? 'Planilha recebida' : 'Receber planilha'}
      >
        <span className="planilha-flow-btn__icon" aria-hidden>
          {recebida ? <Check size={15} strokeWidth={2.4} /> : <Inbox size={15} strokeWidth={2.2} />}
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
  )
}
