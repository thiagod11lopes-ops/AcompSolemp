import { Button } from '@mui/material'
import InventoryIcon from '@mui/icons-material/Inventory'
import DownloadIcon from '@mui/icons-material/Download'
import { useState } from 'react'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'
import { usePlanilhaDraft } from '@/hooks/usePlanilhaDraft'
import { PlanilhaEnvioModalShell } from '@/components/clinica/PlanilhaEnvioModalShell'
import { downloadMaterialOds, getMaterialOdsFileName } from '@/utils/materialOdsExport'

interface MaterialEnvioModalProps {
  open: boolean
  consumoRows: ConsumoMaterialRow[]
  mesReferencia?: MesConsumoModelo
  onClose: () => void
}

export function MaterialEnvioModal({
  open,
  consumoRows,
  mesReferencia,
  onClose,
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
      disabled={isGenerating}
      exportError={exportError}
      onClose={onClose}
      onCabecalhoChange={updateCabecalho}
      onLinhaChange={updateLinha}
      onInserirLinha={inserirLinha}
      onExcluirLinha={excluirLinha}
      footerActions={
        <>
          <Button onClick={onClose} disabled={isGenerating} color="inherit" size="small">
            Fechar
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleGerarPlanilha}
            disabled={isGenerating || linhas.length === 0}
            sx={{ fontWeight: 700 }}
          >
            {isGenerating ? 'Gerando...' : 'Gerar .ods'}
          </Button>
        </>
      }
    />
  )
}
