import { useState, type ReactNode } from 'react'
import { Button, Dialog, AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import CloseIcon from '@mui/icons-material/Close'
import { PlanilhaEnvioModalShell } from '@/components/clinica/PlanilhaEnvioModalShell'
import { MaterialEnvioModal } from '@/components/clinica/MaterialEnvioModal'
import { ImhAbaPlanilhaPreview } from '@/components/clinica/ImhAbaPlanilhaPreview'
import { ImhMedicamentoPlanilhaPreview } from '@/components/clinica/ImhMedicamentoPlanilhaPreview'
import { DivMaterialPlanilhaPreview } from '@/components/clinica/DivMaterialPlanilhaPreview'
import { DevolverPlanilhaButton } from '@/components/ordenador/DevolverPlanilhaButton'
import type { ImhAbaFormData, PedidoPlanilhaEnvioState } from '@/types'
import { calcImhSomasValorEIndenizar } from '@/utils/imhAbaForm'
import { calcImhMedicamentoTotalGeral } from '@/utils/imhMedicamentoForm'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import {
  createDefaultPlanilhaDataFiltro,
  type PlanilhaDataFiltro,
} from '@/utils/planilhaDataFiltro'

interface AuditoriaPlanilhaModalProps {
  open: boolean
  pedidoNumero: string
  planilha: PedidoPlanilhaEnvioState | null
  onClose: () => void
  title?: string
  /** Preferência de visualização quando o pedido tem vários formatos. */
  preferFormato?: 'imh' | 'controleSolemp' | 'divMaterial'
  onDevolver?: () => void
}

function PlanilhaFullscreenShell({
  open,
  onClose,
  title,
  subtitle,
  onDevolver,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  onDevolver?: () => void
  children: ReactNode
}) {
  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { display: 'flex', flexDirection: 'column', bgcolor: 'background.default' },
        },
      }}
    >
      <AppBar position="static" color="primary" elevation={1} sx={{ flexShrink: 0 }}>
        <Toolbar variant="dense" sx={{ gap: 1, minHeight: 44, px: { xs: 1, sm: 2 } }}>
          <DescriptionIcon />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {subtitle}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {onDevolver ? <DevolverPlanilhaButton onClick={onDevolver} /> : null}
            <IconButton edge="end" onClick={onClose} color="inherit" aria-label="Fechar">
              <CloseIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, sm: 2 } }}>{children}</Box>
      <Box
        sx={{
          flexShrink: 0,
          px: 2,
          py: 1.25,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        {onDevolver ? (
          <DevolverPlanilhaButton onClick={onDevolver} color="primary" variant="outlined" />
        ) : null}
        <Button onClick={onClose} variant="contained" size="small" sx={{ fontWeight: 700 }}>
          Fechar
        </Button>
      </Box>
    </Dialog>
  )
}

function DivMaterialPlanilhaModalBody({
  linhas,
}: {
  linhas: NonNullable<PedidoPlanilhaEnvioState['divMaterialLinhas']>
}) {
  const [dataFiltro, setDataFiltro] = useState<PlanilhaDataFiltro>(() => ({
    ...createDefaultPlanilhaDataFiltro(),
    mostrarTodos: true,
  }))

  return (
    <DivMaterialPlanilhaPreview
      linhas={linhas}
      dataFiltro={dataFiltro}
      onDataFiltroChange={setDataFiltro}
    />
  )
}

function ImhAbaPlanilhaModalBody({ value }: { value: ImhAbaFormData }) {
  const [dataFiltro, setDataFiltro] = useState<PlanilhaDataFiltro>(() => ({
    ...createDefaultPlanilhaDataFiltro(),
    mostrarTodos: true,
  }))

  return (
    <ImhAbaPlanilhaPreview
      value={value}
      dataFiltro={dataFiltro}
      onDataFiltroChange={setDataFiltro}
    />
  )
}

export function AuditoriaPlanilhaModal({
  open,
  pedidoNumero,
  planilha,
  onClose,
  title,
  preferFormato,
  onDevolver,
}: AuditoriaPlanilhaModalProps) {
  if (!planilha) return null

  const modalTitle = title ?? `Auditoria — Planilha ${pedidoNumero}`
  const pmeLinhas = planilha.imhMedicamentoLinhas ?? []
  const isPme = planilha.formato === 'imhMedicamento' || pmeLinhas.length > 0

  if (isPme) {
    const total = calcImhMedicamentoTotalGeral({ linhas: pmeLinhas })
    return (
      <PlanilhaFullscreenShell
        open={open}
        onClose={onClose}
        title={modalTitle}
        subtitle={`${pmeLinhas.length} lançamento(s)${
          total > 0 ? ` · Total ${formatValorBrasileiro(total)}` : ''
        }`}
        onDevolver={onDevolver}
      >
        <ImhMedicamentoPlanilhaPreview value={{ linhas: pmeLinhas }} readOnly />
      </PlanilhaFullscreenShell>
    )
  }

  const imhAbaLinhas = planilha.imhAbaLinhas ?? []
  const hasImhAba = imhAbaLinhas.length > 0
  // Snapshot fiel da aba IMH: mesma grade vista na clínica (Auditoria / Contabilidade).
  const showImhAba =
    hasImhAba &&
    preferFormato !== 'divMaterial' &&
    preferFormato !== 'controleSolemp'

  if (showImhAba) {
    const formValue: ImhAbaFormData = {
      clinica: planilha.cabecalho.fornecedor ?? '',
      numeroCp: planilha.cabecalho.numeroRelacao ?? '',
      linhas: imhAbaLinhas,
    }
    const somas = calcImhSomasValorEIndenizar(imhAbaLinhas)
    return (
      <PlanilhaFullscreenShell
        open={open}
        onClose={onClose}
        title={modalTitle}
        subtitle={`IMH · ${imhAbaLinhas.length} lançamento(s)${
          somas.valorTotal > 0 ? ` · Total ${formatValorBrasileiro(somas.valorTotal)}` : ''
        }`}
        onDevolver={onDevolver}
      >
        <ImhAbaPlanilhaModalBody value={formValue} />
      </PlanilhaFullscreenShell>
    )
  }

  const divLinhas = planilha.divMaterialLinhas ?? []
  const hasDiv = divLinhas.length > 0
  // Div. Material enviada pela clínica é a fonte da verdade no fluxo
  // Confecção → Solemp em Rascunho → Empenhado (não usar o remap Controle Solemp).
  const showDivMaterial = hasDiv && preferFormato !== 'imh'

  if (showDivMaterial) {
    return (
      <PlanilhaFullscreenShell
        open={open}
        onClose={onClose}
        title={modalTitle}
        subtitle={`Div. de Material · ${divLinhas.length} lançamento(s)`}
        onDevolver={onDevolver}
      >
        <DivMaterialPlanilhaModalBody linhas={divLinhas} />
      </PlanilhaFullscreenShell>
    )
  }

  const hasControle = Boolean(planilha.controleSolempLinhas?.length)
  const hasImh = Boolean(planilha.linhas?.length)
  const isControleSolemp =
    preferFormato === 'controleSolemp'
      ? hasControle
      : preferFormato === 'imh' || preferFormato === 'divMaterial'
        ? false
        : planilha.formato === 'controleSolemp' || (hasControle && !hasImh && !hasDiv)

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
        onDevolver={onDevolver}
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
      savedAt={
        planilha.recebidaImhEm ??
        planilha.encaminhadaImhEm ??
        planilha.recebidaConfeccaoEm ??
        planilha.recebidaEm ??
        planilha.enviadoEm
      }
      isSaving={false}
      disabled
      onClose={onClose}
      headerCloseExtra={
        onDevolver ? <DevolverPlanilhaButton onClick={onDevolver} /> : null
      }
      onCabecalhoChange={() => {}}
      onLinhaChange={() => {}}
      onInserirLinha={() => {}}
      onExcluirLinha={() => {}}
      footerActions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onDevolver ? (
            <DevolverPlanilhaButton
              onClick={onDevolver}
              color="primary"
              variant="outlined"
            />
          ) : null}
          <Button onClick={onClose} variant="contained" size="small" sx={{ fontWeight: 700 }}>
            Fechar
          </Button>
        </Box>
      }
    />
  )
}
