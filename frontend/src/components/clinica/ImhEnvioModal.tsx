import { Button } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import SendIcon from '@mui/icons-material/Send'
import DownloadIcon from '@mui/icons-material/Download'
import { useState } from 'react'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'
import { usePlanilhaDraft } from '@/hooks/usePlanilhaDraft'
import { PlanilhaEnvioModalShell } from '@/components/clinica/PlanilhaEnvioModalShell'
import { buildImhXlsxLinhas, getImhXlsxFileName } from '@/utils/imhXlsxLinha'
import { downloadImhXlsx } from '@/utils/imhXlsxExport'

interface ImhEnvioModalProps {
  open: boolean
  consumoRows: ConsumoMaterialRow[]
  mesReferencia?: MesConsumoModelo
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ImhEnvioModal({
  open,
  consumoRows,
  mesReferencia,
  isSubmitting = false,
  onClose,
  onConfirm,
}: ImhEnvioModalProps) {
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const {
    cabecalho,
    linhas,
    grupos,
    savedAt,
    isSaving,
    updateCabecalho,
    updateLinha,
    adicionarMaterial,
  } = usePlanilhaDraft('imh', open, consumoRows, mesReferencia)

  const busy = isSubmitting || isGeneratingXlsx

  const handleGerarPlanilhaXlsx = async () => {
    setExportError(null)
    setIsGeneratingXlsx(true)
    try {
      const linhasXlsx = buildImhXlsxLinhas(consumoRows, linhas)
      await downloadImhXlsx(linhasXlsx, cabecalho, getImhXlsxFileName(cabecalho))
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao gerar planilha Excel')
    } finally {
      setIsGeneratingXlsx(false)
    }
  }

  return (
    <PlanilhaEnvioModalShell
      open={open}
      title="Planilha IMH — Envio para Contabilidade"
      lancamentoCount={consumoRows.length}
      icon={<DescriptionIcon />}
      appBarColor="primary"
      cabecalho={cabecalho}
      linhas={linhas}
      grupos={grupos}
      savedAt={savedAt}
      isSaving={isSaving}
      disabled={busy}
      exportError={exportError}
      onClose={onClose}
      onCabecalhoChange={updateCabecalho}
      onLinhaChange={updateLinha}
      onAdicionarMaterial={adicionarMaterial}
      footerActions={
        <>
          <Button onClick={onClose} disabled={busy} color="inherit" size="small">
            Cancelar
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleGerarPlanilhaXlsx}
            disabled={busy || consumoRows.length === 0}
          >
            {isGeneratingXlsx ? 'Gerando...' : 'Gerar .xlsx'}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SendIcon />}
            onClick={onConfirm}
            disabled={busy || linhas.length === 0}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Enviando...' : 'Confirmar envio IMH'}
          </Button>
        </>
      }
    />
  )
}
