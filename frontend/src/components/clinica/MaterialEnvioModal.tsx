import { Button } from '@mui/material'
import InventoryIcon from '@mui/icons-material/Inventory'
import DownloadIcon from '@mui/icons-material/Download'
import SendIcon from '@mui/icons-material/Send'
import { useState } from 'react'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'
import { usePlanilhaDraft } from '@/hooks/usePlanilhaDraft'
import { PlanilhaEnvioModalShell } from '@/components/clinica/PlanilhaEnvioModalShell'
import { downloadMaterialOds, getMaterialOdsFileName } from '@/utils/materialOdsExport'
import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'

interface MaterialEnvioModalProps {
  open: boolean
  consumoRows: ConsumoMaterialRow[]
  mesReferencia?: MesConsumoModelo
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: (planilha: ImhPlanilha) => void
}

export function MaterialEnvioModal({
  open,
  consumoRows,
  mesReferencia,
  isSubmitting = false,
  onClose,
  onConfirm,
}: MaterialEnvioModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const {
    cabecalho,
    linhas,
    savedAt,
    isSaving,
    updateCabecalho,
    updateLinha,
    inserirLinha,
    excluirLinha,
  } = usePlanilhaDraft('material', open, consumoRows, mesReferencia)

  const busy = isSubmitting || isGenerating

  const handleGerarPlanilha = async () => {
    setExportError(null)
    setIsGenerating(true)
    try {
      await downloadMaterialOds({ cabecalho, linhas }, getMaterialOdsFileName(cabecalho))
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao gerar planilha')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <PlanilhaEnvioModalShell
      open={open}
      title="Planilha Material — Aba MODELO OPME TRO"
      lancamentoCount={consumoRows.length}
      icon={<InventoryIcon />}
      appBarColor="secondary"
      cabecalho={cabecalho}
      linhas={linhas}
      savedAt={savedAt}
      isSaving={isSaving}
      disabled={busy}
      exportError={exportError}
      onClose={onClose}
      onCabecalhoChange={updateCabecalho}
      onLinhaChange={updateLinha}
      onInserirLinha={inserirLinha}
      onExcluirLinha={excluirLinha}
      footerActions={
        <>
          <Button onClick={onClose} disabled={busy} color="inherit" size="small">
            Cancelar
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleGerarPlanilha}
            disabled={busy || linhas.length === 0}
          >
            {isGenerating ? 'Gerando...' : 'Gerar .ods'}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SendIcon />}
            onClick={() => onConfirm({ cabecalho, linhas })}
            disabled={busy || linhas.length === 0}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar para Conf. de Solemp'}
          </Button>
        </>
      }
    />
  )
}
