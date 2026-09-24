import {
  Alert,
  Box,
  Button,
  Snackbar,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { subscribeDemoAppDataChanged } from '@/mocks/seed'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicas, useEmpresas } from '@/hooks/useCadastros'
import {
  useAdicionarFluxoParalelo,
  useCreateClinicaPedido,
  useClinicaPedidos,
} from '@/hooks/useClinicaPedidos'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { DivMaterialForm } from '@/components/clinica/DivMaterialForm'
import { ImhAbaForm } from '@/components/clinica/ImhAbaForm'
import { ImhDivMaterialEnvioModal } from '@/components/clinica/ImhDivMaterialEnvioModal'
import {
  PlanilhaApagarModal,
  type PlanilhaApagarConfirmacao,
} from '@/components/clinica/PlanilhaApagarModal'
import { ImhMedicamentoForm } from '@/components/clinica/ImhMedicamentoForm'
import { ListaMedicamentosForm } from '@/components/clinica/ListaMedicamentosForm'
import { PacientesPmeSpreadsheet } from '@/components/clinica/PacientesPmeSpreadsheet'
import { clinicaPlanilhasLivresService } from '@/services/clinicaPlanilhasLivresService'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import type {
  ConmedComrjFormData,
  ImhAbaFormData,
  ImhAbaLinha,
  ImhMedicamentoFormData,
  ListaMedicamentosFormData,
  PlanilhaLivreAba,
} from '@/types'
import {
  getFixedPlanilhas,
  type PlanilhasModo,
} from '@/utils/planilhasFixas'
import {
  EMPTY_CONMED_COMRJ_FORM,
  normalizeConmedComrjForm,
} from '@/utils/conmedComrjForm'
import {
  loadConmedSheetsFromFile,
  mergeConmedImport,
  parseConmedComrjFromGrid,
} from '@/utils/conmedComrjImport'
import { EMPTY_IMH_MEDICAMENTO_FORM } from '@/utils/imhMedicamentoForm'
import { EMPTY_LISTA_MEDICAMENTOS_FORM } from '@/utils/listaMedicamentosForm'
import {
  clonePacientesPmeSeed,
  type PacientePmeRow,
} from '@/utils/pacientesPme'
import {
  normalizeConsumoMaterialRows,
  type ConsumoMaterialRow,
  type SpreadsheetSheetImport,
} from '@/utils/consumoMaterialOds'
import {
  createPedidoLoteId,
  dataPertenceAoMes,
  findPedidoParaMesmasLinhas,
  getMesModeloFromParts,
} from '@/utils/consumoMaterialTemplate'
import {
  buildDivMaterialLinhas,
  divMaterialLinhasToPedidoInput,
  type DivMaterialLinha,
} from '@/utils/divMaterialForm'
import {
  createDefaultPlanilhaDataFiltro,
  normalizePlanilhaDataFiltro,
  normalizePlanilhaFiltrosPersistidos,
  type PlanilhaDataFiltro,
  type PlanilhaFiltrosPersistidos,
} from '@/utils/planilhaDataFiltro'
import { EMPTY_LISTA_MATERIAIS_FORM } from '@/utils/listaMateriaisForm'
import {
  mergeLinhasCorrigir,
  resolveCorrigirLinhaIds,
} from '@/utils/corrigirDevolucao'
import {
  EMPTY_IMH_ABA_FORM,
  imhAbaLinhasToPedidoInput,
  linhaHasContent,
  markImhAbaLinhasFinalized,
  sortImhLinhasByData,
  syncImhAbaFromFontes,
} from '@/utils/imhAbaForm'

const IMH_ABA_ID = 'imh'
const DIV_MATERIAL_ABA_ID = 'div-material'
const LISTA_MEDICAMENTOS_ABA_ID = 'lista-de-medicamentos'
const PACIENTES_ABA_ID = 'pacientes'

type PersistPayload = {
  abas?: PlanilhaLivreAba[]
  abaAtivaId?: string | null
  conmed?: ConmedComrjFormData
  consumo?: ConsumoMaterialRow[]
  imh?: ImhAbaFormData
  imhMedicamento?: ImhMedicamentoFormData
  listaMedicamentos?: ListaMedicamentosFormData
  pacientesPme?: PacientePmeRow[]
  finalizedDivMaterialIds?: string[]
  devolvidosDivMaterialIds?: string[]
  planilhaFiltros?: PlanilhaFiltrosPersistidos
}

function AbaVaziaPlaceholder({ titulo }: { titulo: string }) {
  return (
    <Box
      sx={(theme) => ({
        border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
        borderRadius: 2,
        px: 3,
        py: 6,
        textAlign: 'center',
        bgcolor: alpha(theme.palette.background.paper, 0.6),
      })}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
        {titulo}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Sem conteúdo no momento.
      </Typography>
    </Box>
  )
}

function preferModeloSheetIndex(sheets: SpreadsheetSheetImport[]): number {
  const exact = sheets.findIndex((s) => s.nome.trim().toUpperCase() === 'MODELO')
  if (exact >= 0) return exact
  const partial = sheets.findIndex((s) => s.nome.toUpperCase().includes('MODELO'))
  return partial >= 0 ? partial : 0
}

export default function ClinicaNovoPedidoPage() {
  const [searchParams] = useSearchParams()
  const { user } = useClinicaAuth()
  const { navigatePortal } = usePortalPaths()
  const clinicaId = user?.clinicaId ?? ''
  const { data: clinicas = [] } = useClinicas()
  const { data: empresas = [] } = useEmpresas()
  const { data: pedidos = [] } = useClinicaPedidos()
  const createPedido = useCreateClinicaPedido()
  const adicionarFluxo = useAdicionarFluxoParalelo()
  const clinicaLogada = clinicas.find((c) => c.id === clinicaId)
  const isMedicamento =
    user?.perfil === 'MEDICAMENTO' || clinicaLogada?.tipo === 'medicamento'
  const planilhasModo: PlanilhasModo = isMedicamento ? 'medicamento' : 'clinica'
  const fixedPlanilhas = useMemo(() => getFixedPlanilhas(planilhasModo), [planilhasModo])

  const [abas, setAbas] = useState<PlanilhaLivreAba[]>([])
  const [abaAtivaId, setAbaAtivaId] = useState<string | null>(null)
  const [conmedForm, setConmedForm] = useState<ConmedComrjFormData>(EMPTY_CONMED_COMRJ_FORM)
  const [imhForm, setImhForm] = useState<ImhAbaFormData>(EMPTY_IMH_ABA_FORM)
  const [imhMedicamentoForm, setImhMedicamentoForm] = useState<ImhMedicamentoFormData>(
    EMPTY_IMH_MEDICAMENTO_FORM,
  )
  const [listaMedicamentosForm, setListaMedicamentosForm] = useState<ListaMedicamentosFormData>(
    EMPTY_LISTA_MEDICAMENTOS_FORM,
  )
  const [pacientesPmeRows, setPacientesPmeRows] = useState<PacientePmeRow[]>([])
  const [consumoRows, setConsumoRows] = useState<ConsumoMaterialRow[]>([])
  const [divMaterialLinhas, setDivMaterialLinhas] = useState<DivMaterialLinha[]>([])
  const [selectedImhIds, setSelectedImhIds] = useState<Set<string>>(() => new Set())
  const [selectedDivMaterialIds, setSelectedDivMaterialIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [finalizedDivMaterialIds, setFinalizedDivMaterialIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [devolvidosDivMaterialIds, setDevolvidosDivMaterialIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [imhDataFiltro, setImhDataFiltro] = useState<PlanilhaDataFiltro>(() =>
    createDefaultPlanilhaDataFiltro(),
  )
  const [divMaterialDataFiltro, setDivMaterialDataFiltro] = useState<PlanilhaDataFiltro>(() =>
    createDefaultPlanilhaDataFiltro(),
  )
  const [envioModalOpen, setEnvioModalOpen] = useState(false)
  const [isEnviando, setIsEnviando] = useState(false)
  const [apagarOpen, setApagarOpen] = useState(false)
  const [apagarAbaNome, setApagarAbaNome] = useState('IMH')
  const [importing, setImporting] = useState(false)
  const [sheetPicker, setSheetPicker] = useState<{
    open: boolean
    fileName: string
    sheets: SpreadsheetSheetImport[]
    initialSheetIndex: number
  }>({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
  const [feedback, setFeedback] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
  }>({ open: false, severity: 'success', message: '' })

  const importInputRef = useRef<HTMLInputElement | null>(null)
  const hydratedModoRef = useRef<string | null>(null)
  const abasRef = useRef(abas)
  const abaAtivaIdRef = useRef(abaAtivaId)
  const conmedFormRef = useRef(conmedForm)
  const imhFormRef = useRef(imhForm)
  const imhMedicamentoFormRef = useRef(imhMedicamentoForm)
  const listaMedicamentosFormRef = useRef(listaMedicamentosForm)
  const pacientesPmeRowsRef = useRef(pacientesPmeRows)
  const consumoRowsRef = useRef(consumoRows)
  const divMaterialLinhasRef = useRef(divMaterialLinhas)
  const finalizedDivMaterialIdsRef = useRef(finalizedDivMaterialIds)
  const devolvidosDivMaterialIdsRef = useRef(devolvidosDivMaterialIds)
  const imhDataFiltroRef = useRef(imhDataFiltro)
  const divMaterialDataFiltroRef = useRef(divMaterialDataFiltro)
  const modoRef = useRef(planilhasModo)
  abasRef.current = abas
  abaAtivaIdRef.current = abaAtivaId
  conmedFormRef.current = conmedForm
  imhFormRef.current = imhForm
  imhMedicamentoFormRef.current = imhMedicamentoForm
  listaMedicamentosFormRef.current = listaMedicamentosForm
  pacientesPmeRowsRef.current = pacientesPmeRows
  consumoRowsRef.current = consumoRows
  divMaterialLinhasRef.current = divMaterialLinhas
  finalizedDivMaterialIdsRef.current = finalizedDivMaterialIds
  devolvidosDivMaterialIdsRef.current = devolvidosDivMaterialIds
  imhDataFiltroRef.current = imhDataFiltro
  divMaterialDataFiltroRef.current = divMaterialDataFiltro
  modoRef.current = planilhasModo

  useEffect(() => {
    if (!clinicaId) return
    const hydrateKey = `${clinicaId}:${planilhasModo}`
    if (hydratedModoRef.current === hydrateKey) return
    hydratedModoRef.current = hydrateKey
    const state = clinicaPlanilhasLivresService.getState(clinicaId, planilhasModo)
    setAbas(state.abas)
    setAbaAtivaId(state.abaAtivaId ?? fixedPlanilhas[0]?.id ?? null)
    setConmedForm(state.conmedComrj ?? EMPTY_CONMED_COMRJ_FORM)
    setImhMedicamentoForm(state.imhMedicamento ?? EMPTY_IMH_MEDICAMENTO_FORM)
    setListaMedicamentosForm(state.listaMedicamentos ?? EMPTY_LISTA_MEDICAMENTOS_FORM)
    setPacientesPmeRows(state.pacientesPme ?? (isMedicamento ? clonePacientesPmeSeed() : []))
    const consumo = normalizeConsumoMaterialRows(state.consumoMaterialConsignado)
    setConsumoRows(isMedicamento ? consumo : [])
    setFinalizedDivMaterialIds(new Set(state.finalizedDivMaterialIds ?? []))
    setDevolvidosDivMaterialIds(new Set(state.devolvidosDivMaterialIds ?? []))
    const filtros = normalizePlanilhaFiltrosPersistidos(state.planilhaFiltros)
    setImhDataFiltro(filtros.imh ?? createDefaultPlanilhaDataFiltro())
    setDivMaterialDataFiltro(filtros.divMaterial ?? createDefaultPlanilhaDataFiltro())
    if (!isMedicamento) {
      const conmed = state.conmedComrj ?? EMPTY_CONMED_COMRJ_FORM
      const syncedImh = syncImhAbaFromFontes(state.imh ?? EMPTY_IMH_ABA_FORM, {
        conmed,
        consumoRows: [],
      })
      setImhForm(syncedImh)
      setDivMaterialLinhas(
        buildDivMaterialLinhas({
          consumoRows: [],
          conmed,
          empresas,
        }),
      )
    } else {
      setImhForm(state.imh ?? EMPTY_IMH_ABA_FORM)
      setDivMaterialLinhas([])
    }
    // empresas: resolve CNPJ no build quando já carregado; reimporta após cadastro.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate uma vez por clínica/modo
  }, [clinicaId, planilhasModo, fixedPlanilhas, isMedicamento])

  useEffect(() => {
    if (!clinicaId) return
    return subscribeDemoAppDataChanged(() => {
      const state = clinicaPlanilhasLivresService.getState(clinicaId, modoRef.current)
      const imh = state.imhMedicamento
      if (imh) {
        setImhMedicamentoForm((prev) => ({
          ...prev,
          finalizedImhIds: imh.finalizedImhIds ?? prev.finalizedImhIds,
          devolvidosImhIds: imh.devolvidosImhIds ?? prev.devolvidosImhIds,
        }))
      }
      if (state.imh) {
        setImhForm((prev) => ({
          ...prev,
          finalizedImhIds: state.imh?.finalizedImhIds ?? prev.finalizedImhIds,
          devolvidosImhIds: state.imh?.devolvidosImhIds ?? prev.devolvidosImhIds,
        }))
      }
      if (state.finalizedDivMaterialIds) {
        setFinalizedDivMaterialIds(new Set(state.finalizedDivMaterialIds))
      }
      if (state.devolvidosDivMaterialIds) {
        setDevolvidosDivMaterialIds(new Set(state.devolvidosDivMaterialIds))
      }
    })
  }, [clinicaId])

  const persist = useCallback(
    (patch: PersistPayload = {}) => {
      if (!clinicaId) return
      const stored = clinicaPlanilhasLivresService.getState(clinicaId, modoRef.current)
      const storedImh = stored.imhMedicamento
      clinicaPlanilhasLivresService.saveState(
        clinicaId,
        {
          abas: patch.abas ?? abasRef.current,
          abaAtivaId:
            patch.abaAtivaId !== undefined ? patch.abaAtivaId : abaAtivaIdRef.current,
          conmedComrj: patch.conmed ?? conmedFormRef.current,
          consumoMaterialConsignado: patch.consumo ?? consumoRowsRef.current,
          imh: patch.imh ?? imhFormRef.current,
          imhMedicamento: patch.imhMedicamento ?? {
            ...imhMedicamentoFormRef.current,
            finalizedImhIds:
              storedImh?.finalizedImhIds ?? imhMedicamentoFormRef.current.finalizedImhIds,
            devolvidosImhIds:
              storedImh?.devolvidosImhIds ?? imhMedicamentoFormRef.current.devolvidosImhIds,
          },
          listaMedicamentos: patch.listaMedicamentos ?? listaMedicamentosFormRef.current,
          pacientesPme: patch.pacientesPme ?? pacientesPmeRowsRef.current,
          listaMateriais: stored.listaMateriais ?? EMPTY_LISTA_MATERIAIS_FORM,
          finalizedDivMaterialIds:
            patch.finalizedDivMaterialIds ?? [...finalizedDivMaterialIdsRef.current],
          devolvidosDivMaterialIds:
            patch.devolvidosDivMaterialIds ?? [...devolvidosDivMaterialIdsRef.current],
          planilhaFiltros: patch.planilhaFiltros ?? {
            imh: imhDataFiltroRef.current,
            divMaterial: divMaterialDataFiltroRef.current,
          },
        },
        modoRef.current,
      )
    },
    [clinicaId],
  )

  const handleImhDataFiltroChange = useCallback(
    (next: PlanilhaDataFiltro) => {
      const normalized = normalizePlanilhaDataFiltro(next)
      setImhDataFiltro(normalized)
      persist({
        planilhaFiltros: {
          imh: normalized,
          divMaterial: divMaterialDataFiltroRef.current,
        },
      })
    },
    [persist],
  )

  const handleDivMaterialDataFiltroChange = useCallback(
    (next: PlanilhaDataFiltro) => {
      const normalized = normalizePlanilhaDataFiltro(next)
      setDivMaterialDataFiltro(normalized)
      persist({
        planilhaFiltros: {
          imh: imhDataFiltroRef.current,
          divMaterial: normalized,
        },
      })
    },
    [persist],
  )

  const abaAtiva = useMemo(
    () => abas.find((aba) => aba.id === abaAtivaId) ?? abas[0] ?? null,
    [abas, abaAtivaId],
  )

  const corrigirPedidoId = searchParams.get('corrigir')
  const abaCorrigir = searchParams.get('aba')
  const corrigirHydratedRef = useRef<string | null>(null)

  const pedidoCorrigir = useMemo(
    () =>
      corrigirPedidoId ? (pedidos.find((p) => p.id === corrigirPedidoId) ?? null) : null,
    [corrigirPedidoId, pedidos],
  )

  const planilhaCorrigir = useMemo(
    () =>
      corrigirPedidoId ? pedidoPlanilhaEnvioService.getForPedido(corrigirPedidoId) : null,
    [corrigirPedidoId, pedidos],
  )

  const idsCorrigir = useMemo(() => {
    if (!pedidoCorrigir) return null
    const ids = resolveCorrigirLinhaIds(pedidoCorrigir, planilhaCorrigir)
    return ids.size > 0 ? ids : null
  }, [pedidoCorrigir, planilhaCorrigir])

  const modoCorrigir = Boolean(idsCorrigir)

  const selectedImhCount = useMemo(() => {
    const finalized = new Set(imhForm.finalizedImhIds ?? [])
    const linhas = idsCorrigir
      ? imhForm.linhas.filter((l) => idsCorrigir.has(l.id))
      : imhForm.linhas
    return linhas.filter(
      (l) => selectedImhIds.has(l.id) && !finalized.has(l.id) && linhaHasContent(l),
    ).length
  }, [imhForm, selectedImhIds, idsCorrigir])

  const selectedDivCount = useMemo(() => {
    const linhas = idsCorrigir
      ? divMaterialLinhas.filter((l) => idsCorrigir.has(l.id))
      : divMaterialLinhas
    return linhas.filter(
      (l) => selectedDivMaterialIds.has(l.id) && !finalizedDivMaterialIds.has(l.id),
    ).length
  }, [divMaterialLinhas, selectedDivMaterialIds, finalizedDivMaterialIds, idsCorrigir])

  const applyModeloSheet = useCallback(
    (sheet: SpreadsheetSheetImport) => {
      const parsed = normalizeConmedComrjForm(parseConmedComrjFromGrid(sheet.rows))
      const hasProcess = Boolean(
        parsed.numero ||
          parsed.data ||
          parsed.processo ||
          parsed.pregaoTad ||
          parsed.vigencia ||
          parsed.fornecedor,
      )
      const hasPatients = parsed.pacientes.length > 0
      if (!hasProcess && !hasPatients) {
        setFeedback({
          open: true,
          severity: 'error',
          message:
            'Não foi possível identificar o MODELO nessa aba. Use a planilha CONMED (aba MODELO).',
        })
        return
      }

      const nextConmed = mergeConmedImport(EMPTY_CONMED_COMRJ_FORM, parsed)
      const nextConsumo: ConsumoMaterialRow[] = []
      const nextImh = syncImhAbaFromFontes(imhFormRef.current, {
        conmed: nextConmed,
        consumoRows: nextConsumo,
      })
      const nextDiv = buildDivMaterialLinhas({
        consumoRows: nextConsumo,
        conmed: nextConmed,
        empresas,
      })

      setConmedForm(nextConmed)
      setConsumoRows(nextConsumo)
      setImhForm(nextImh)
      setDivMaterialLinhas(nextDiv)
      setSelectedImhIds(new Set())
      setSelectedDivMaterialIds(new Set())

      const goToImh =
        abaAtivaIdRef.current !== IMH_ABA_ID && abaAtivaIdRef.current !== DIV_MATERIAL_ABA_ID
      if (goToImh) setAbaAtivaId(IMH_ABA_ID)

      persist({
        conmed: nextConmed,
        consumo: nextConsumo,
        imh: nextImh,
        ...(goToImh ? { abaAtivaId: IMH_ABA_ID } : {}),
      })

      setFeedback({
        open: true,
        severity: 'success',
        message: `Planilha importada${sheet.nome ? ` (aba “${sheet.nome}”)` : ''}: ${nextImh.linhas.length} linha(s) IMH e ${nextDiv.length} na Div. Material.`,
      })
    },
    [empresas, persist],
  )

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    try {
      const sheets = await loadConmedSheetsFromFile(file)
      if (sheets.length === 0) {
        setFeedback({
          open: true,
          severity: 'error',
          message: 'O arquivo não contém abas legíveis.',
        })
        return
      }
      if (sheets.length === 1) {
        applyModeloSheet(sheets[0])
        return
      }
      setSheetPicker({
        open: true,
        fileName: file.name,
        sheets,
        initialSheetIndex: preferModeloSheetIndex(sheets),
      })
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
    setSheetPicker({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
    if (sheet) applyModeloSheet(sheet)
  }

  const handleRequestClear = (abaNome: string) => {
    setApagarAbaNome(abaNome)
    setApagarOpen(true)
  }

  const handleConfirmApagar = (opts: PlanilhaApagarConfirmacao) => {
    if (opts.apagarTudo) {
      const nextImh = EMPTY_IMH_ABA_FORM
      setConmedForm(EMPTY_CONMED_COMRJ_FORM)
      setConsumoRows([])
      setImhForm(nextImh)
      setSelectedImhIds(new Set())
      setSelectedDivMaterialIds(new Set())
      setFinalizedDivMaterialIds(new Set())
      setDivMaterialLinhas([])
      persist({
        conmed: EMPTY_CONMED_COMRJ_FORM,
        consumo: [],
        imh: nextImh,
        finalizedDivMaterialIds: [],
      })
      setApagarOpen(false)
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Todo o conteúdo das abas IMH e Div. Material foi apagado.',
      })
      return
    }

    const mesModelo = getMesModeloFromParts(opts.mes, opts.ano)
    const nextConmed: ConmedComrjFormData = {
      ...conmedFormRef.current,
      pacientes: (conmedFormRef.current.pacientes ?? []).filter(
        (p) => !dataPertenceAoMes(p.data, mesModelo),
      ),
    }
    const nextConsumo = consumoRowsRef.current.filter(
      (row) => !dataPertenceAoMes(row.data, mesModelo),
    )
    const manuaisForaPeriodo = imhFormRef.current.linhas.filter(
      (linha) =>
        !linha.id.startsWith('imh-auto-') && !dataPertenceAoMes(linha.data, mesModelo),
    )
    const baseImh: ImhAbaFormData = {
      ...imhFormRef.current,
      linhas: manuaisForaPeriodo,
    }
    const nextImh = syncImhAbaFromFontes(baseImh, {
      conmed: nextConmed,
      consumoRows: nextConsumo,
    })
    const nextDiv = buildDivMaterialLinhas({
      consumoRows: nextConsumo,
      conmed: nextConmed,
      empresas,
    })
    const keptDivIds = new Set(nextDiv.map((l) => l.id))
    const nextFinalizedDiv = [...finalizedDivMaterialIdsRef.current].filter((id) =>
      keptDivIds.has(id),
    )

    setConmedForm(nextConmed)
    setConsumoRows(nextConsumo)
    setImhForm(nextImh)
    setDivMaterialLinhas(nextDiv)
    setFinalizedDivMaterialIds(new Set(nextFinalizedDiv))
    setSelectedImhIds((prev) => {
      const next = new Set(prev)
      for (const id of prev) {
        if (!nextImh.linhas.some((l) => l.id === id)) next.delete(id)
      }
      return next
    })
    setSelectedDivMaterialIds((prev) => {
      const next = new Set(prev)
      for (const id of prev) {
        if (!keptDivIds.has(id)) next.delete(id)
      }
      return next
    })
    persist({
      conmed: nextConmed,
      consumo: nextConsumo,
      imh: nextImh,
      finalizedDivMaterialIds: nextFinalizedDiv,
    })
    setApagarOpen(false)
    const mesNome =
      [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ][opts.mes - 1] ?? String(opts.mes)
    setFeedback({
      open: true,
      severity: 'success',
      message: `Lançamentos de ${mesNome}/${opts.ano} removidos de IMH e Div. Material.`,
    })
  }

  const handleImhChange = useCallback(
    (next: ImhAbaFormData) => {
      setImhForm(next)
      persist({ imh: next })
    },
    [persist],
  )

  const handleImhMedicamentoChange = useCallback(
    (next: ImhMedicamentoFormData) => {
      setImhMedicamentoForm(next)
      persist({ imhMedicamento: next })
    },
    [persist],
  )

  const handleListaMedicamentosChange = useCallback(
    (next: ListaMedicamentosFormData) => {
      setListaMedicamentosForm(next)
      persist({ listaMedicamentos: next })
    },
    [persist],
  )

  const handlePacientesPmeChange = useCallback(
    (next: PacientePmeRow[]) => {
      setPacientesPmeRows(next)
      persist({ pacientesPme: next })
    },
    [persist],
  )

  const handleChangeAba = (abaId: string) => {
    setAbaAtivaId(abaId)
    persist({ abaAtivaId: abaId })
  }

  // Hidrata linhas ausentes a partir do snapshot enviado e pré-seleciona para reenvio.
  useEffect(() => {
    if (!corrigirPedidoId || !idsCorrigir) return
    if (corrigirHydratedRef.current === corrigirPedidoId) return
    corrigirHydratedRef.current = corrigirPedidoId

    const planilha = planilhaCorrigir
    if (isMedicamento) {
      const existing = new Set(imhMedicamentoFormRef.current.linhas.map((l) => l.id))
      const fromSnap = (planilha?.imhMedicamentoLinhas ?? []).filter(
        (l) => idsCorrigir.has(l.id) && !existing.has(l.id),
      )
      if (fromSnap.length > 0) {
        const next: ImhMedicamentoFormData = {
          ...imhMedicamentoFormRef.current,
          linhas: [...imhMedicamentoFormRef.current.linhas, ...fromSnap],
        }
        setImhMedicamentoForm(next)
        persist({ imhMedicamento: next })
      }
      return
    }

    const existingImh = new Set(imhFormRef.current.linhas.map((l) => l.id))
    const fromImhSnap: ImhAbaLinha[] = (planilha?.imhAbaLinhas?.length
      ? planilha.imhAbaLinhas
      : (planilha?.linhas ?? []).map((linha) => {
          const id = linha.pacienteGrupoId || linha.id
          if (!id) return null
          return {
            id,
            data: linha.data ?? '',
            nip: linha.nip ?? '',
            nomeUsuario: linha.iniciais ?? '',
            vinculo: '',
            descricao: linha.descricaoMaterial || linha.procedimento || '',
            nipTitular: '',
            valorUnit: linha.valorUnit ?? '',
            quantidade: linha.qt ?? '',
            valorTotal: linha.valorTotal ?? '',
            pctIndenizar: '',
          } satisfies ImhAbaLinha
        })
    )
      .filter((l): l is ImhAbaLinha => Boolean(l))
      .filter((l) => idsCorrigir.has(l.id) && !existingImh.has(l.id))

    if (fromImhSnap.length > 0) {
      const nextImh: ImhAbaFormData = {
        ...imhFormRef.current,
        linhas: sortImhLinhasByData([...imhFormRef.current.linhas, ...fromImhSnap]),
      }
      setImhForm(nextImh)
      persist({ imh: nextImh })
    }

    const existingDiv = new Set(divMaterialLinhasRef.current.map((l) => l.id))
    const fromDivSnap = (planilha?.divMaterialLinhas ?? []).filter(
      (l) => idsCorrigir.has(l.id) && !existingDiv.has(l.id),
    )
    if (fromDivSnap.length > 0) {
      setDivMaterialLinhas([...divMaterialLinhasRef.current, ...fromDivSnap])
    }

    const imhIds = new Set<string>()
    const divIds = new Set<string>()
    for (const id of idsCorrigir) {
      if (
        imhFormRef.current.linhas.some((l) => l.id === id) ||
        fromImhSnap.some((l) => l.id === id)
      ) {
        imhIds.add(id)
      }
      if (
        divMaterialLinhasRef.current.some((l) => l.id === id) ||
        fromDivSnap.some((l) => l.id === id)
      ) {
        divIds.add(id)
      }
    }
    if (imhIds.size > 0) setSelectedImhIds(imhIds)
    if (divIds.size > 0) setSelectedDivMaterialIds(divIds)
  }, [corrigirPedidoId, idsCorrigir, isMedicamento, persist, planilhaCorrigir])

  useEffect(() => {
    if (!abaCorrigir) return
    const ids = new Set([
      ...fixedPlanilhas.map((f) => f.id),
      ...abasRef.current.map((a) => a.id),
    ])
    if (!ids.has(abaCorrigir)) return
    setAbaAtivaId(abaCorrigir)
    persist({ abaAtivaId: abaCorrigir })
  }, [abaCorrigir, fixedPlanilhas, persist, corrigirPedidoId])

  const imhFormVisivel = useMemo(() => {
    if (!idsCorrigir) return imhForm
    return {
      ...imhForm,
      linhas: sortImhLinhasByData(imhForm.linhas.filter((l) => idsCorrigir.has(l.id))),
    }
  }, [imhForm, idsCorrigir])

  const imhMedicamentoFormVisivel = useMemo(() => {
    if (!idsCorrigir) return imhMedicamentoForm
    return {
      ...imhMedicamentoForm,
      linhas: imhMedicamentoForm.linhas.filter((l) => idsCorrigir.has(l.id)),
    }
  }, [imhMedicamentoForm, idsCorrigir])

  const divMaterialLinhasVisiveis = useMemo(() => {
    if (!idsCorrigir) return divMaterialLinhas
    return divMaterialLinhas.filter((l) => idsCorrigir.has(l.id))
  }, [divMaterialLinhas, idsCorrigir])

  const handleImhChangeCorrigir = useCallback(
    (next: ImhAbaFormData) => {
      if (!idsCorrigir) {
        handleImhChange(next)
        return
      }
      const merged: ImhAbaFormData = {
        ...next,
        linhas: sortImhLinhasByData(
          mergeLinhasCorrigir(imhFormRef.current.linhas, next.linhas, idsCorrigir),
        ),
        finalizedImhIds: next.finalizedImhIds ?? imhFormRef.current.finalizedImhIds,
        devolvidosImhIds: next.devolvidosImhIds ?? imhFormRef.current.devolvidosImhIds,
      }
      handleImhChange(merged)
    },
    [handleImhChange, idsCorrigir],
  )

  const handleImhMedicamentoChangeCorrigir = useCallback(
    (next: ImhMedicamentoFormData) => {
      if (!idsCorrigir) {
        handleImhMedicamentoChange(next)
        return
      }
      const merged: ImhMedicamentoFormData = {
        ...next,
        linhas: mergeLinhasCorrigir(
          imhMedicamentoFormRef.current.linhas,
          next.linhas,
          idsCorrigir,
        ),
        finalizedImhIds:
          next.finalizedImhIds ?? imhMedicamentoFormRef.current.finalizedImhIds,
        devolvidosImhIds:
          next.devolvidosImhIds ?? imhMedicamentoFormRef.current.devolvidosImhIds,
      }
      handleImhMedicamentoChange(merged)
    },
    [handleImhMedicamentoChange, idsCorrigir],
  )

  const handleDivMaterialChangeCorrigir = useCallback(
    (next: DivMaterialLinha[]) => {
      if (!idsCorrigir) {
        setDivMaterialLinhas(next)
        return
      }
      setDivMaterialLinhas(
        mergeLinhasCorrigir(divMaterialLinhasRef.current, next, idsCorrigir),
      )
    },
    [idsCorrigir],
  )

  const handleAbrirEnvio = () => {
    if (selectedImhCount === 0 && selectedDivCount === 0) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Marque ao menos um lançamento na IMH ou na Div. Material para enviar.',
      })
      return
    }
    setEnvioModalOpen(true)
  }

  const handleEnviarPlanilhas = async () => {
    const clinicaNome = clinicaLogada?.nome ?? ''
    if (!clinicaNome || !clinicaId) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Clínica não identificada. Faça login novamente.',
      })
      return
    }

    const finalizedImh = new Set(imhForm.finalizedImhIds ?? [])
    const imhSelecionadas = imhForm.linhas.filter(
      (l) => selectedImhIds.has(l.id) && !finalizedImh.has(l.id) && linhaHasContent(l),
    )
    const divSelecionadas = divMaterialLinhas.filter(
      (l) => selectedDivMaterialIds.has(l.id) && !finalizedDivMaterialIds.has(l.id),
    )

    if (imhSelecionadas.length === 0 && divSelecionadas.length === 0) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Marque ao menos um lançamento na IMH ou na Div. Material para enviar.',
      })
      return
    }

    const temImh = imhSelecionadas.length > 0
    const temDiv = divSelecionadas.length > 0
    const fluxo = temImh && temDiv ? 'paralelo' : temImh ? 'auditoria' : 'confeccao'

    setIsEnviando(true)
    try {
      const rowIds = [
        ...imhSelecionadas.map((l) => l.id),
        ...divSelecionadas.map((l) => l.id),
      ]
      let pedidoId: string

      if (corrigirPedidoId && pedidos.some((p) => p.id === corrigirPedidoId)) {
        pedidoId = corrigirPedidoId
        if (temImh) await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'auditoria' })
        if (temDiv) await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'confeccao' })
      } else {
        const pedidoExistente = findPedidoParaMesmasLinhas(pedidos, rowIds, clinicaId)
        if (pedidoExistente) {
          pedidoId = pedidoExistente.id
          if (temImh) await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'auditoria' })
          if (temDiv) await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'confeccao' })
        } else {
          pedidoId = createPedidoLoteId()
          const baseInput = temImh
            ? imhAbaLinhasToPedidoInput(imhSelecionadas, clinicaNome)
            : divMaterialLinhasToPedidoInput(divSelecionadas, clinicaNome)
          await createPedido.mutateAsync({
            ...baseInput,
            id: pedidoId,
            fluxo,
            consumoRowIds: rowIds,
          })
        }
      }

      if (temImh) {
        // Envia a IMH exatamente como na aba (linhas marcadas, colunas intactas).
        pedidoPlanilhaEnvioService.saveImhAbaForPedido(
          pedidoId,
          { clinica: imhForm.clinica, numeroCp: imhForm.numeroCp },
          imhSelecionadas,
        )
      }
      if (temDiv) {
        // Envia a Div. Material exatamente como na aba (linhas marcadas, colunas intactas).
        pedidoPlanilhaEnvioService.saveDivMaterialForPedido(pedidoId, divSelecionadas)
      }

      // Garante que o snapshot da planilha suba à nuvem após o pedido.
      try {
        const { flushSupabaseAppDataSync } = await import('@/data/persistence/supabaseSync')
        await flushSupabaseAppDataSync()
      } catch {
        // Local/demo: sync opcional
      }

      const nextImh = temImh
        ? markImhAbaLinhasFinalized(
            imhForm,
            imhSelecionadas.map((l) => l.id),
          )
        : imhForm
      const nextDivFinalized = new Set(finalizedDivMaterialIds)
      const nextDivDevolvidos = new Set(devolvidosDivMaterialIds)
      for (const linha of divSelecionadas) {
        nextDivFinalized.add(linha.id)
        nextDivDevolvidos.delete(linha.id)
      }

      if (temImh) setImhForm(nextImh)
      if (temDiv) {
        setFinalizedDivMaterialIds(nextDivFinalized)
        setDevolvidosDivMaterialIds(nextDivDevolvidos)
      }
      persist({
        ...(temImh ? { imh: nextImh } : {}),
        ...(temDiv
          ? {
              finalizedDivMaterialIds: [...nextDivFinalized],
              devolvidosDivMaterialIds: [...nextDivDevolvidos],
            }
          : {}),
      })

      if (temImh) {
        setSelectedImhIds((prev) => {
          const next = new Set(prev)
          for (const linha of imhSelecionadas) next.delete(linha.id)
          return next
        })
      }
      if (temDiv) {
        setSelectedDivMaterialIds((prev) => {
          const next = new Set(prev)
          for (const linha of divSelecionadas) next.delete(linha.id)
          return next
        })
      }

      setEnvioModalOpen(false)
      const partes: string[] = []
      if (temImh) partes.push(`IMH (${imhSelecionadas.length}) → Auditoria`)
      if (temDiv) partes.push(`Div. Material (${divSelecionadas.length}) → Confecção de Solemp`)
      setFeedback({
        open: true,
        severity: 'success',
        message: `${partes.join(' · ')}.`,
      })
      navigatePortal(`/clinica/timeline/${pedidoId}`)
    } catch {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Erro ao enviar planilhas. Tente novamente.',
      })
    } finally {
      setIsEnviando(false)
    }
  }

  const tabsSource = abas.length
    ? abas
    : fixedPlanilhas.map((f) => ({ id: f.id, nome: f.nome }))
  const tabValue =
    abaAtivaId && tabsSource.some((a) => a.id === abaAtivaId)
      ? abaAtivaId
      : (tabsSource[0]?.id ?? false)

  const renderContent = () => {
    if (isMedicamento) {
      if (abaAtivaId === IMH_ABA_ID) {
        return (
          <ImhMedicamentoForm
            value={imhMedicamentoFormVisivel}
            onChange={handleImhMedicamentoChangeCorrigir}
            pacientes={pacientesPmeRows}
            onPacientesChange={handlePacientesPmeChange}
            listaMedicamentos={listaMedicamentosForm}
            onListaMedicamentosChange={handleListaMedicamentosChange}
            corrigirPedidoId={corrigirPedidoId}
            corrigirLinhaIds={idsCorrigir}
          />
        )
      }
      if (abaAtivaId === LISTA_MEDICAMENTOS_ABA_ID) {
        return (
          <ListaMedicamentosForm
            value={listaMedicamentosForm}
            onChange={handleListaMedicamentosChange}
          />
        )
      }
      if (abaAtivaId === PACIENTES_ABA_ID) {
        return (
          <PacientesPmeSpreadsheet
            value={pacientesPmeRows}
            onChange={handlePacientesPmeChange}
          />
        )
      }
      return abaAtiva ? <AbaVaziaPlaceholder titulo={abaAtiva.nome} /> : null
    }

    if (abaAtivaId === IMH_ABA_ID) {
      return (
        <ImhAbaForm
          value={imhFormVisivel}
          onChange={handleImhChangeCorrigir}
          selectedImhIds={selectedImhIds}
          onSelectedImhIdsChange={setSelectedImhIds}
          hideImport
          onRequestClear={modoCorrigir ? undefined : () => handleRequestClear('IMH')}
          dataFiltro={
            modoCorrigir ? { ...imhDataFiltro, mostrarTodos: true } : imhDataFiltro
          }
          onDataFiltroChange={handleImhDataFiltroChange}
        />
      )
    }
    if (abaAtivaId === DIV_MATERIAL_ABA_ID) {
      return (
        <DivMaterialForm
          linhas={divMaterialLinhasVisiveis}
          onChange={handleDivMaterialChangeCorrigir}
          selectedIds={selectedDivMaterialIds}
          onSelectedIdsChange={setSelectedDivMaterialIds}
          finalizedIds={finalizedDivMaterialIds}
          devolvidosIds={devolvidosDivMaterialIds}
          onRequestClear={
            modoCorrigir ? undefined : () => handleRequestClear('Div. Material')
          }
          dataFiltro={
            modoCorrigir
              ? { ...divMaterialDataFiltro, mostrarTodos: true }
              : divMaterialDataFiltro
          }
          onDataFiltroChange={handleDivMaterialDataFiltroChange}
        />
      )
    }
    return abaAtiva ? <AbaVaziaPlaceholder titulo={abaAtiva.nome} /> : null
  }

  return (
    <>
      <Box sx={{ mb: 1.5 }}>
        <Box
          sx={(theme) => ({
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderRadius: '8px 8px 0 0',
            px: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          })}
        >
          {!isMedicamento && !modoCorrigir ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={handleImportClick}
              disabled={importing || isEnviando}
              sx={{
                ml: 0.5,
                my: 0.5,
                flexShrink: 0,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
              }}
            >
              {importing ? 'Importando…' : 'Importar Planilha'}
            </Button>
          ) : null}
          <Tabs
            value={tabValue}
            onChange={(_, value: string) => handleChangeAba(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: 1,
              minHeight: 42,
              minWidth: 0,
              '& .MuiTab-root': {
                minHeight: 42,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                px: 1.5,
              },
            }}
          >
            {tabsSource.map((aba) => (
              <Tab key={aba.id} value={aba.id} label={aba.nome} />
            ))}
          </Tabs>
          {!isMedicamento ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              onClick={handleAbrirEnvio}
              disabled={isEnviando}
              sx={{
                mr: 1,
                my: 0.5,
                flexShrink: 0,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
              }}
            >
              {modoCorrigir ? 'Reenviar planilha' : 'Enviar planilha'}
            </Button>
          ) : null}
        </Box>
      </Box>

      {modoCorrigir && idsCorrigir ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Corrigindo planilha devolvida — exibindo apenas as {idsCorrigir.size} linha(s)
          enviadas neste pedido. Corrija o necessário e reenvie.
        </Alert>
      ) : null}

      {renderContent()}

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
        hidden
        onChange={handleImportFileChange}
      />

      <ConmedEscolherAbaModal
        open={sheetPicker.open}
        sheetNames={sheetPicker.sheets.map((s) => s.nome)}
        fileName={sheetPicker.fileName}
        initialSheetIndex={sheetPicker.initialSheetIndex}
        description={
          sheetPicker.fileName
            ? `O arquivo “${sheetPicker.fileName}” tem várias abas. Escolha a aba MODELO para preencher IMH e Div. Material.`
            : 'O arquivo tem várias abas. Escolha a aba MODELO para preencher IMH e Div. Material.'
        }
        onCancel={() =>
          setSheetPicker({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
        }
        onConfirm={handleConfirmSheet}
      />

      <ImhDivMaterialEnvioModal
        open={envioModalOpen}
        imhCount={selectedImhCount}
        divMaterialCount={selectedDivCount}
        isSubmitting={isEnviando}
        onClose={() => {
          if (!isEnviando) setEnvioModalOpen(false)
        }}
        onEnviar={handleEnviarPlanilhas}
      />

      <PlanilhaApagarModal
        open={apagarOpen}
        abaNome={apagarAbaNome}
        onClose={() => setApagarOpen(false)}
        onConfirm={handleConfirmApagar}
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
    </>
  )
}
