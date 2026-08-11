import { Button } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import { PlanilhaEnvioModalShell } from '@/components/clinica/PlanilhaEnvioModalShell'
import { MaterialEnvioModal } from '@/components/clinica/MaterialEnvioModal'
import type { PedidoPlanilhaEnvioState } from '@/types'

interface AuditoriaPlanilhaModalProps {
  open: boolean
  pedidoNumero: string
  planilha: PedidoPlanilhaEnvioState | null
  onClose: () => void
  title?: string
  /** Preferência de visualização quando o pedido tem ambos os formatos. */
  preferFormato?: 'imh' | 'controleSolemp'
}

export function AuditoriaPlanilhaModal({
  open,
  pedidoNumero,
  planilha,
  onClose,
  title,
  preferFormato,
}: AuditoriaPlanilhaModalProps) {
  if (!planilha) return null

  const modalTitle = title ?? `Auditoria — Planilha ${pedidoNumero}`
  const hasControle = Boolean(planilha.controleSolempLinhas?.length)
  const hasImh = Boolean(planilha.linhas?.length)
  const isControleSolemp =
    preferFormato === 'controleSolemp'
      ? hasControle
      : preferFormato === 'imh'
        ? false
        : planilha.formato === 'controleSolemp' || (hasControle && !hasImh)

  if (isControleSolemp) {
    return (
      <MaterialEnvioModal
        open={open}
        consumoRows={[]}
        planilhaInicial={{
          linhas: planilha.controleSolempLinhas ?? [],
        }}
        title={modalTitle}
        onClose={onClose}
        onConfirm={() => undefined}
        previewOnly
      />
    )
  }

  return (
    <PlanilhaEnvioModalShell
      open={open}
      title={modalTitle}
      lancamentoCount={planilha.linhas.filter((l) => l.isLinhaPaciente).length}
      icon={<DescriptionIcon />}
      appBarColor="primary"
      cabecalho={planilha.cabecalho}
      linhas={planilha.linhas}
      savedAt={planilha.recebidaImhEm ?? planilha.encaminhadaImhEm ?? planilha.recebidaEm ?? planilha.enviadoEm}
      isSaving={false}
      disabled
      onClose={onClose}
      onCabecalhoChange={() => {}}
      onLinhaChange={() => {}}
      onInserirLinha={() => {}}
      onExcluirLinha={() => {}}
      footerActions={
        <Button onClick={onClose} variant="contained" size="small" sx={{ fontWeight: 700 }}>
          Fechar
        </Button>
      }
    />
  )
}
