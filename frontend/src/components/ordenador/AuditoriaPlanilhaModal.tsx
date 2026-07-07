import { Button } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import { PlanilhaEnvioModalShell } from '@/components/clinica/PlanilhaEnvioModalShell'
import type { PedidoPlanilhaEnvioState } from '@/types'

interface AuditoriaPlanilhaModalProps {
  open: boolean
  pedidoNumero: string
  planilha: PedidoPlanilhaEnvioState | null
  onClose: () => void
}

export function AuditoriaPlanilhaModal({
  open,
  pedidoNumero,
  planilha,
  onClose,
}: AuditoriaPlanilhaModalProps) {
  if (!planilha) return null

  return (
    <PlanilhaEnvioModalShell
      open={open}
      title={`Auditoria — Planilha ${pedidoNumero}`}
      lancamentoCount={planilha.linhas.filter((l) => l.isLinhaPaciente).length}
      icon={<DescriptionIcon />}
      appBarColor="primary"
      cabecalho={planilha.cabecalho}
      linhas={planilha.linhas}
      savedAt={planilha.recebidaEm ?? planilha.enviadoEm}
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
