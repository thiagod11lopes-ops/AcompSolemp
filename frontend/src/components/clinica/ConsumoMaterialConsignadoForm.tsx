import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import { ConsumoMaterialManualForm } from '@/components/clinica/ConsumoMaterialManualForm'
import { ConsumoMaterialPlanilhaPreview } from '@/components/clinica/ConsumoMaterialPlanilhaPreview'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { ClinicaEnvioParaleloModal } from '@/components/clinica/ClinicaEnvioParaleloModal'
import { ImhEnvioModal } from '@/components/clinica/ImhEnvioModal'
import { MaterialEnvioModal } from '@/components/clinica/MaterialEnvioModal'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicas } from '@/hooks/useCadastros'
import {
  useAdicionarFluxoParalelo,
  useCreateClinicaPedido,
  useClinicaPedidos,
} from '@/hooks/useClinicaPedidos'
import { consumoPlanilhaService } from '@/services/consumoPlanilhaService'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import { loadAppData } from '@/mocks/seed'
import {
  parseConsumoMaterialFromGrid,
  parseSpreadsheetSheetsFile,
  consumoRowsToPedidoInput,
  type ConsumoMaterialRow,
  type SpreadsheetSheetImport,
} from '@/utils/consumoMaterialOds'
import {
  ANOS_PLANILHA_DISPONIVEIS,
  createPedidoLoteId,
  dataPertenceAoMes,
  findPedidoParaMesmasLinhas,
  getMesModeloFromParts,
  getRowIdsComPedido,
  renumerarLinhasConsumo,
  rowPodeSerEnviadaAuditoria,
  rowPodeSerEnviadaMaterial,
} from '@/utils/consumoMaterialTemplate'
import { buildImhPlanilhaFromConsumo } from '@/utils/imhPlanilhaTemplate'
import { buildControleSolempFromConsumo } from '@/utils/controleSolempTemplate'

const MESES_OPCOES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
] as const

interface ConsumoMaterialConsignadoFormProps {
  value: ConsumoMaterialRow[]
  onChange: (next: ConsumoMaterialRow[]) => void
}

function sheetHasContent(sheet: SpreadsheetSheetImport): boolean {
  return sheet.rows.some((row) => row.some((cell) => String(cell ?? '').trim()))
}

const FORNECEDOR_TODOS = '__todos__'

function anosDisponiveis(rows: ConsumoMaterialRow[]): number[] {
  const anos = new Set<number>(ANOS_PLANILHA_DISPONIVEIS)
  anos.add(new Date().getFullYear())
  for (const row of rows) {
    const match = row.data.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (!match) continue
    const yearRaw = match[3]
    const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10)
    if (Number.isFinite(year)) anos.add(year)
  }
  return [...anos].sort((a, b) => b - a)
}

function fornecedoresDisponiveis(rows: ConsumoMaterialRow[]): string[] {
  const set = new Set<string>()
  for (const row of rows) {
    const nome = row.fornecedor.trim()
    if (nome) set.add(nome)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function ConsumoMaterialConsignadoForm({
  value,
  onChange,
}: ConsumoMaterialConsignadoFormProps) {
  const { navigatePortal } = usePortalPaths()
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''
  const { data: clinicas = [] } = useClinicas()
  const { data: pedidos = [] } = useClinicaPedidos()
  const createPedido = useCreateClinicaPedido()
  const adicionarFluxo = useAdicionarFluxoParalelo()
  const clinicaLogada = clinicas.find((c) => c.id === clinicaId)

  const [filtroMes, setFiltroMes] = useState(() => new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(() => new Date().getFullYear())
  const [filtroFornecedor, setFiltroFornecedor] = useState(FORNECEDOR_TODOS)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [sheetPicker, setSheetPicker] = useState<{
    open: boolean
    fileName: string
    sheets: SpreadsheetSheetImport[]
  }>({ open: false, fileName: '', sheets: [] })
  const [feedback, setFeedback] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
  }>({ open: false, severity: 'success', message: '' })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [finalizedAuditoriaIds, setFinalizedAuditoriaIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [finalizedMaterialIds, setFinalizedMaterialIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [isEnviando, setIsEnviando] = useState(false)
  const [paraleloOpen, setParaleloOpen] = useState(false)
  const [paraleloRows, setParaleloRows] = useState<ConsumoMaterialRow[]>([])
  const [paraleloPreview, setParaleloPreview] = useState<'auditoria' | 'confeccao' | null>(
    null,
  )
  const [previewAuditoriaOpen, setPreviewAuditoriaOpen] = useState(false)
  const [previewConfeccaoOpen, setPreviewConfeccaoOpen] = useState(false)

  const mesFiltro = useMemo(
    () => getMesModeloFromParts(filtroMes, filtroAno),
    [filtroMes, filtroAno],
  )

  const anosOptions = useMemo(() => anosDisponiveis(value), [value])
  const fornecedoresOptions = useMemo(() => fornecedoresDisponiveis(value), [value])

  const rowsFiltradas = useMemo(
    () =>
      value.filter((row) => {
        if (!dataPertenceAoMes(row.data, mesFiltro)) return false
        if (
          filtroFornecedor !== FORNECEDOR_TODOS &&
          row.fornecedor.trim() !== filtroFornecedor
        ) {
          return false
        }
        return true
      }),
    [value, mesFiltro, filtroFornecedor],
  )

  const finalizedIds = useMemo(() => {
    const next = new Set<string>()
    for (const id of finalizedAuditoriaIds) {
      if (finalizedMaterialIds.has(id)) next.add(id)
    }
    return next
  }, [finalizedAuditoriaIds, finalizedMaterialIds])

  const rowIdsComPedido = useMemo(() => {
    const data = loadAppData()
    return getRowIdsComPedido(pedidos, data.pedidoPlanilhaEnvio, data.processosArquivados)
  }, [pedidos, finalizedAuditoriaIds, finalizedMaterialIds])

  useEffect(() => {
    if (!clinicaId) return
    const persisted = consumoPlanilhaService.getState(clinicaId)
    const auditoria = new Set(
      persisted.finalizedAuditoriaRowIds ?? persisted.finalizedRowIds ?? [],
    )
    const material = new Set(persisted.finalizedMaterialRowIds ?? [])
    setFinalizedAuditoriaIds(auditoria)
    setFinalizedMaterialIds(material)
  }, [clinicaId])

  const emptyHint = useMemo(() => {
    const partes = [mesFiltro.label]
    if (filtroFornecedor !== FORNECEDOR_TODOS) partes.push(`fornecedor “${filtroFornecedor}”`)
    return `Nenhum lançamento em ${partes.join(' · ')}. Ajuste o filtro ou importe/adicione dados.`
  }, [mesFiltro.label, filtroFornecedor])

  const nextNumero = useMemo(() => {
    if (editingRowId) {
      const current = value.find((r) => r.id === editingRowId)
      if (current?.numero) return current.numero
    }
    return String(value.length + 1)
  }, [editingRowId, value])

  const editingRow = useMemo(
    () => (editingRowId ? value.find((r) => r.id === editingRowId) ?? null : null),
    [editingRowId, value],
  )

  const applyImportedSheet = (sheet: SpreadsheetSheetImport) => {
    try {
      const parsed = renumerarLinhasConsumo(parseConsumoMaterialFromGrid(sheet.rows))
      onChange(parsed)
      setEditingRowId(null)
      setSelectedIds(new Set())
      setFeedback({
        open: true,
        severity: 'success',
        message: `Planilha importada${sheet.nome ? ` (aba “${sheet.nome}”)` : ''}: ${parsed.length} lançamento(s).`,
      })
    } catch (err) {
      setFeedback({
        open: true,
        severity: 'error',
        message: err instanceof Error ? err.message : 'Falha ao interpretar a planilha.',
      })
    }
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    try {
      const sheets = (await parseSpreadsheetSheetsFile(file)).filter(sheetHasContent)
      if (sheets.length === 0) {
        setFeedback({
          open: true,
          severity: 'error',
          message: 'O arquivo não contém abas legíveis.',
        })
        return
      }
      if (sheets.length === 1) {
        applyImportedSheet(sheets[0])
        return
      }
      setSheetPicker({ open: true, fileName: file.name, sheets })
    } catch (err) {
      setFeedback({
        open: true,
        severity: 'error',
        message: err instanceof Error ? err.message : 'Falha ao ler a planilha.',
      })
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmSheet = (sheetIndex: number) => {
    const sheet = sheetPicker.sheets[sheetIndex]
    setSheetPicker({ open: false, fileName: '', sheets: [] })
    if (sheet) applyImportedSheet(sheet)
  }

  const handleAddOrUpdate = (row: ConsumoMaterialRow) => {
    if (editingRowId) {
      const next = value.map((item) =>
        item.id === editingRowId ? { ...row, id: editingRowId } : item,
      )
      onChange(renumerarLinhasConsumo(next))
      setEditingRowId(null)
      return
    }
    onChange(renumerarLinhasConsumo([...value, row]))
  }

  const handleEdit = (rowId: string) => {
    setEditingRowId(rowId)
  }

  const handleDelete = (rowId: string) => {
    const next = value.filter((r) => r.id !== rowId)
    onChange(renumerarLinhasConsumo(next))
    if (editingRowId === rowId) setEditingRowId(null)
    setSelectedIds((prev) => {
      if (!prev.has(rowId)) return prev
      const nextSet = new Set(prev)
      nextSet.delete(rowId)
      return nextSet
    })
  }

  const handleToggleRow = useCallback(
    (rowId: string) => {
      if (finalizedIds.has(rowId)) return
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(rowId)) next.delete(rowId)
        else next.add(rowId)
        return next
      })
    },
    [finalizedIds],
  )

  const handleToggleAllVisible = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const row of rowsFiltradas) {
          if (finalizedIds.has(row.id)) continue
          if (checked) next.add(row.id)
          else next.delete(row.id)
        }
        return next
      })
    },
    [rowsFiltradas, finalizedIds],
  )

  const handleAbrirParalelo = () => {
    const selecionadas = rowsFiltradas.filter(
      (row) => selectedIds.has(row.id) && !finalizedIds.has(row.id),
    )
    if (selecionadas.length === 0) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Marque o checklist MI nos lançamentos que deseja enviar.',
      })
      return
    }
    setParaleloRows(selecionadas)
    setParaleloOpen(true)
  }

  const handleVisualizarAuditoria = () => {
    setParaleloPreview('auditoria')
    setParaleloOpen(false)
    setPreviewAuditoriaOpen(true)
  }

  const handleVisualizarConfeccao = () => {
    setParaleloPreview('confeccao')
    setParaleloOpen(false)
    setPreviewConfeccaoOpen(true)
  }

  const handleFecharPreviewAuditoria = () => {
    if (isEnviando) return
    setPreviewAuditoriaOpen(false)
    if (paraleloPreview === 'auditoria') {
      setParaleloPreview(null)
      setParaleloOpen(true)
    }
  }

  const handleFecharPreviewConfeccao = () => {
    if (isEnviando) return
    setPreviewConfeccaoOpen(false)
    if (paraleloPreview === 'confeccao') {
      setParaleloPreview(null)
      setParaleloOpen(true)
    }
  }

  const handleEnviarAmbas = async () => {
    const clinicaNome = clinicaLogada?.nome ?? ''
    if (!clinicaNome || !clinicaId) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Clínica não identificada. Faça login novamente.',
      })
      return
    }

    const novos = paraleloRows.filter(
      (r) =>
        rowPodeSerEnviadaAuditoria(r, rowIdsComPedido, finalizedAuditoriaIds) ||
        rowPodeSerEnviadaMaterial(r, finalizedMaterialIds),
    )

    if (novos.length === 0) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Nenhum lançamento novo para enviar.',
      })
      return
    }

    setIsEnviando(true)
    try {
      const rowIds = novos.map((row) => row.id)
      const pedidoExistente = findPedidoParaMesmasLinhas(pedidos, rowIds, clinicaId)
      const planilhaImh = buildImhPlanilhaFromConsumo(novos, mesFiltro)
      const planilhaControle = buildControleSolempFromConsumo(novos, mesFiltro)
      const tituloPlanilha = planilhaImh.cabecalho.numeroRelacao?.trim() || undefined
      let pedidoId: string

      if (pedidoExistente) {
        pedidoId = pedidoExistente.id
        await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'auditoria' })
        await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'confeccao' })
      } else {
        pedidoId = createPedidoLoteId()
        await createPedido.mutateAsync({
          ...consumoRowsToPedidoInput(novos, clinicaNome, tituloPlanilha, 'auditoria'),
          id: pedidoId,
          fluxo: 'paralelo',
          consumoRowIds: rowIds,
        })
      }

      pedidoPlanilhaEnvioService.saveForPedido(pedidoId, planilhaImh)
      pedidoPlanilhaEnvioService.saveControleSolempForPedido(pedidoId, planilhaControle)

      const nextAuditoria = new Set(finalizedAuditoriaIds)
      const nextMaterial = new Set(finalizedMaterialIds)
      for (const row of novos) {
        nextAuditoria.add(row.id)
        nextMaterial.add(row.id)
      }
      setFinalizedAuditoriaIds(nextAuditoria)
      setFinalizedMaterialIds(nextMaterial)
      consumoPlanilhaService.markRowsFinalizedAuditoria(clinicaId, novos)
      consumoPlanilhaService.markRowsFinalizedMaterial(clinicaId, novos)

      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const row of novos) next.delete(row.id)
        return next
      })
      setParaleloOpen(false)
      setParaleloRows([])
      setParaleloPreview(null)
      setPreviewAuditoriaOpen(false)
      setPreviewConfeccaoOpen(false)
      setFeedback({
        open: true,
        severity: 'success',
        message: `${novos.length} lançamento(s) enviados para Confecção Solemp e Auditoria.`,
      })
      navigatePortal(`/clinica/timeline/${pedidoId}`)
    } catch {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Erro ao enviar lançamentos para Confecção Solemp/Auditoria. Tente novamente.',
      })
    } finally {
      setIsEnviando(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px, 380px) minmax(0, 1fr)' },
        gap: 1.5,
        alignItems: 'start',
      }}
    >
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 1,
          borderRadius: 1.5,
          border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          position: { lg: 'sticky' },
          top: { lg: 8 },
          maxHeight: { lg: 'calc(100vh - 88px)' },
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        })}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, mb: 0.5, display: 'block', letterSpacing: 0.2 }}
        >
          {editingRow ? 'Editando lançamento' : 'Novo lançamento'}
        </Typography>
        <ConsumoMaterialManualForm
          key={editingRow?.id ?? 'new'}
          nextNumero={nextNumero}
          editingRow={editingRow}
          onCancelEdit={() => setEditingRowId(null)}
          onAddRow={handleAddOrUpdate}
          compact
        />
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
            mb: 0.75,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}
          >
            Planilha (ao vivo)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel id="consumo-filtro-mes-label">Mês</InputLabel>
              <Select
                labelId="consumo-filtro-mes-label"
                label="Mês"
                value={filtroMes}
                onChange={(e) => setFiltroMes(Number(e.target.value))}
              >
                {MESES_OPCOES.map((mes) => (
                  <MenuItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 96 }}>
              <InputLabel id="consumo-filtro-ano-label">Ano</InputLabel>
              <Select
                labelId="consumo-filtro-ano-label"
                label="Ano"
                value={filtroAno}
                onChange={(e) => setFiltroAno(Number(e.target.value))}
              >
                {anosOptions.map((ano) => (
                  <MenuItem key={ano} value={ano}>
                    {ano}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              size="small"
              sx={{ minWidth: 200, maxWidth: 280 }}
              options={[FORNECEDOR_TODOS, ...fornecedoresOptions]}
              value={
                filtroFornecedor === FORNECEDOR_TODOS ||
                fornecedoresOptions.includes(filtroFornecedor)
                  ? filtroFornecedor
                  : FORNECEDOR_TODOS
              }
              onChange={(_, next) => {
                setFiltroFornecedor(next ?? FORNECEDOR_TODOS)
              }}
              getOptionLabel={(option) =>
                option === FORNECEDOR_TODOS ? 'Todos' : option
              }
              isOptionEqualToValue={(option, selected) => option === selected}
              renderInput={(params) => (
                <TextField {...params} label="Fornecedor" placeholder="Todos" />
              )}
            />
          </Box>
        </Box>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
          hidden
          onChange={handleImportFileChange}
        />
        <ConsumoMaterialPlanilhaPreview
          rows={rowsFiltradas}
          editingRowId={editingRowId}
          importing={importing}
          enviando={isEnviando}
          selectedIds={selectedIds}
          finalizedIds={finalizedIds}
          onImportClick={handleImportClick}
          onEnviarClick={handleAbrirParalelo}
          onToggleRow={handleToggleRow}
          onToggleAllVisible={handleToggleAllVisible}
          onEditRow={handleEdit}
          onDeleteRow={handleDelete}
          emptyHint={emptyHint}
        />
        <ConmedEscolherAbaModal
          open={sheetPicker.open}
          sheetNames={sheetPicker.sheets.map((s) => s.nome)}
          fileName={sheetPicker.fileName}
          description={
            sheetPicker.fileName
              ? `O arquivo “${sheetPicker.fileName}” tem várias abas. Selecione qual deve preencher o Consumo Material Consignado.`
              : 'O arquivo tem várias abas. Selecione qual deve preencher o Consumo Material Consignado.'
          }
          onCancel={() => setSheetPicker({ open: false, fileName: '', sheets: [] })}
          onConfirm={handleConfirmSheet}
        />
        <ClinicaEnvioParaleloModal
          open={paraleloOpen}
          rows={paraleloRows}
          isSubmitting={isEnviando}
          onClose={() => {
            if (!isEnviando) {
              setParaleloOpen(false)
              setParaleloRows([])
              setParaleloPreview(null)
            }
          }}
          onVisualizarAuditoria={handleVisualizarAuditoria}
          onVisualizarConfeccao={handleVisualizarConfeccao}
          onEnviarAmbas={handleEnviarAmbas}
        />
        <ImhEnvioModal
          open={previewAuditoriaOpen}
          consumoRows={paraleloRows}
          mesReferencia={mesFiltro}
          isSubmitting={isEnviando}
          previewOnly
          onClose={handleFecharPreviewAuditoria}
          onConfirm={() => undefined}
        />
        <MaterialEnvioModal
          open={previewConfeccaoOpen}
          consumoRows={paraleloRows}
          mesReferencia={mesFiltro}
          isSubmitting={isEnviando}
          previewOnly
          onClose={handleFecharPreviewConfeccao}
          onConfirm={() => undefined}
        />
        <Snackbar
          open={feedback.open}
          autoHideDuration={5000}
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={feedback.severity}
            variant="filled"
            onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          >
            {feedback.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  )
}
