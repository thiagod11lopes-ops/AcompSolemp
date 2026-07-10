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
import {
  downloadMedicamentoPmeOds,
  getMedicamentoPmeFileName,
} from '@/utils/medicamentoPmeOdsExport'

import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'

interface ImhEnvioModalProps {
  open: boolean
  consumoRows: ConsumoMaterialRow[]
  mesReferencia?: MesConsumoModelo
  isSubmitting?: boolean
  modoMedicamento?: boolean
  onClose: () => void
  onConfirm: (planilha: ImhPlanilha) => void
}

export function ImhEnvioModal({
  open,
  consumoRows,
  mesReferencia,
  isSubmitting = false,
  modoMedicamento = false,
  onClose,
  onConfirm,
}: ImhEnvioModalProps) {
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false)
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
  } = usePlanilhaDraft('imh', open, consumoRows, mesReferencia)

  const busy = isSubmitting || isGeneratingXlsx

  const handleGerarPlanilhaXlsx = async () => {
    setExportError(null)
    setIsGeneratingXlsx(true)
    try {
      if (modoMedicamento) {
        await downloadMedicamentoPmeOds(
          consumoRows,
          getMedicamentoPmeFileName(mesReferencia?.label),
        )
      } else {
        const linhasXlsx = buildImhXlsxLinhas(consumoRows, linhas)
        await downloadImhXlsx(linhasXlsx, cabecalho, getImhXlsxFileName(cabecalho))
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao gerar planilha')
    } finally {
      setIsGeneratingXlsx(false)
    }
  }

  return (
    <PlanilhaEnvioModalShell
      open={open}
      title={
        modoMedicamento
          ? 'Modelo IHM — PME · Envio direto para Contabilidade/IMH'
          : 'Planilha IMH — Envio para Contabilidade'
      }
      lancamentoCount={consumoRows.length}
      icon={<DescriptionIcon />}
      appBarColor="primary"
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
            onClick={handleGerarPlanilhaXlsx}
            disabled={busy || consumoRows.length === 0}
          >
            {isGeneratingXlsx
              ? 'Gerando...'
              : modoMedicamento
                ? 'Gerar .ods (PME)'
                : 'Gerar .xlsx'}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SendIcon />}
            onClick={() => onConfirm({ cabecalho, linhas })}
            disabled={busy || linhas.length === 0}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting
              ? 'Enviando...'
              : modoMedicamento
                ? 'Confirmar Envio para o IMH'
                : 'Confirmar envio Auditoria'}
          </Button>
        </>
      }
    />
  )
}
