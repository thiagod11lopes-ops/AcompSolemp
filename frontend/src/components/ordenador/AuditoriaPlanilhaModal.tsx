import { Button, Dialog, AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import CloseIcon from '@mui/icons-material/Close'
import { PlanilhaEnvioModalShell } from '@/components/clinica/PlanilhaEnvioModalShell'
import { MaterialEnvioModal } from '@/components/clinica/MaterialEnvioModal'
import { ImhMedicamentoPlanilhaPreview } from '@/components/clinica/ImhMedicamentoPlanilhaPreview'
import { DevolverPlanilhaButton } from '@/components/ordenador/DevolverPlanilhaButton'
import type { PedidoPlanilhaEnvioState } from '@/types'
import { calcImhMedicamentoTotalGeral } from '@/utils/imhMedicamentoForm'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'

interface AuditoriaPlanilhaModalProps {
  open: boolean
  pedidoNumero: string
  planilha: PedidoPlanilhaEnvioState | null
  onClose: () => void
  title?: string
  /** Preferência de visualização quando o pedido tem ambos os formatos. */
  preferFormato?: 'imh' | 'controleSolemp'
  onDevolver?: () => void
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
  const isPme =
    planilha.formato === 'imhMedicamento' || pmeLinhas.length > 0

  if (isPme) {
    const total = calcImhMedicamentoTotalGeral({ linhas: pmeLinhas })
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
                {modalTitle}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {pmeLinhas.length} lançamento(s)
                {total > 0 ? ` · Total ${formatValorBrasileiro(total)}` : ''}
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
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, sm: 2 } }}>
          <ImhMedicamentoPlanilhaPreview
            value={{ linhas: pmeLinhas }}
            readOnly
          />
        </Box>
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
      </Dialog>
    )
  }

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
      savedAt={planilha.recebidaImhEm ?? planilha.encaminhadaImhEm ?? planilha.recebidaEm ?? planilha.enviadoEm}
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
