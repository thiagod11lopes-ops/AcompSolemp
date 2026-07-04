import {
  SetorConclusaoModal,
  type SetorConclusaoVariante,
} from '@/components/ordenador/SetorConclusaoModal'

interface AuditoriaConclusaoModalProps {
  open: boolean
  onClose: () => void
  onEnviar: (anotacoes: string) => void
  loading?: boolean
  pedidoNumero?: string
  /** @default auditoria */
  variante?: SetorConclusaoVariante
}

/** @deprecated use SetorConclusaoModal */
export function AuditoriaConclusaoModal({
  variante = 'auditoria',
  ...props
}: AuditoriaConclusaoModalProps) {
  return <SetorConclusaoModal variante={variante} {...props} />
}
