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
import { PlanilhaBrancaSpreadsheet } from '@/components/clinica/PlanilhaBrancaSpreadsheet'
import { ConmedComrjForm } from '@/components/clinica/ConmedComrjForm'
import { ConsumoMaterialConsignadoForm } from '@/components/clinica/ConsumoMaterialConsignadoForm'
import { DivMaterialForm } from '@/components/clinica/DivMaterialForm'
import { ImhAbaForm } from '@/components/clinica/ImhAbaForm'
import { ImhDivMaterialEnvioModal } from '@/components/clinica/ImhDivMaterialEnvioModal'
import { ImhMedicamentoForm } from '@/components/clinica/ImhMedicamentoForm'
import { ListaMateriaisForm } from '@/components/clinica/ListaMateriaisForm'
import { ListaMedicamentosForm } from '@/components/clinica/ListaMedicamentosForm'
import { PacientesPmeSpreadsheet } from '@/components/clinica/PacientesPmeSpreadsheet'
import {
  clinicaPlanilhasLivresService,
  resolveAbaSheet,
} from '@/services/clinicaPlanilhasLivresService'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import type {
  ConmedComrjFormData,
  ImhAbaFormData,
  ImhMedicamentoFormData,
  ListaMateriaisFormData,
  ListaMedicamentosFormData,
  PlanilhaLivreAba,
} from '@/types'
import {
  getFixedPlanilhas,
  type PlanilhasModo,
} from '@/utils/planilhasFixas'
import { EMPTY_CONMED_COMRJ_FORM } from '@/utils/conmedComrjForm'
import {
  buildImhPlanilhaFromAbaForm,
  EMPTY_IMH_ABA_FORM,
  imhAbaLinhasToPedidoInput,
  linhaHasContent,
  markImhAbaLinhasFinalized,
  syncImhAbaFromFontes,
} from '@/utils/imhAbaForm'
import { EMPTY_IMH_MEDICAMENTO_FORM } from '@/utils/imhMedicamentoForm'
import { EMPTY_LISTA_MATERIAIS_FORM } from '@/utils/listaMateriaisForm'
import { EMPTY_LISTA_MEDICAMENTOS_FORM } from '@/utils/listaMedicamentosForm'
import {
  clonePacientesPmeSeed,
  type PacientePmeRow,
} from '@/utils/pacientesPme'
import {
  normalizeConsumoMaterialRows,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import {
  createPedidoLoteId,
  findPedidoParaMesmasLinhas,
} from '@/utils/consumoMaterialTemplate'
import {
  buildControleSolempFromDivMaterial,
  buildDivMaterialLinhas,
  divMaterialLinhasToPedidoInput,
} from '@/utils/divMaterialForm'
import { type PlanilhaSheetData } from '@/utils/planilhaBrancaGrid'

const CONMED_ABA_ID = 'conmed-comrj'
const CONSUMO_ABA_ID = 'consumo-material-consignado'
const IMH_ABA_ID = 'imh'
const DIV_MATERIAL_ABA_ID = 'div-material'
const LISTA_MATERIAIS_ABA_ID = 'lista-de-materiais'
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
  lista?: ListaMateriaisFormData
  finalizedDivMaterialIds?: string[]
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
  const [listaForm, setListaForm] = useState<ListaMateriaisFormData>(EMPTY_LISTA_MATERIAIS_FORM)
  const [consumoRows, setConsumoRows] = useState<ConsumoMaterialRow[]>([])
  const [selectedImhIds, setSelectedImhIds] = useState<Set<string>>(() => new Set())
  const [selectedDivMaterialIds, setSelectedDivMaterialIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [finalizedDivMaterialIds, setFinalizedDivMaterialIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [envioModalOpen, setEnvioModalOpen] = useState(false)
  const [isEnviando, setIsEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
  }>({ open: false, severity: 'success', message: '' })

  const hydratedModoRef = useRef<string | null>(null)
  const abasRef = useRef(abas)
  const abaAtivaIdRef = useRef(abaAtivaId)
  const conmedFormRef = useRef(conmedForm)
  const imhFormRef = useRef(imhForm)
  const imhMedicamentoFormRef = useRef(imhMedicamentoForm)
  const listaMedicamentosFormRef = useRef(listaMedicamentosForm)
  const pacientesPmeRowsRef = useRef(pacientesPmeRows)
  const listaFormRef = useRef(listaForm)
  const consumoRowsRef = useRef(consumoRows)
  const finalizedDivMaterialIdsRef = useRef(finalizedDivMaterialIds)
  const modoRef = useRef(planilhasModo)
  abasRef.current = abas
  abaAtivaIdRef.current = abaAtivaId
  conmedFormRef.current = conmedForm
  imhFormRef.current = imhForm
  imhMedicamentoFormRef.current = imhMedicamentoForm
  listaMedicamentosFormRef.current = listaMedicamentosForm
  pacientesPmeRowsRef.current = pacientesPmeRows
  listaFormRef.current = listaForm
  consumoRowsRef.current = consumoRows
  finalizedDivMaterialIdsRef.current = finalizedDivMaterialIds
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
    setImhForm(state.imh ?? EMPTY_IMH_ABA_FORM)
    setImhMedicamentoForm(state.imhMedicamento ?? EMPTY_IMH_MEDICAMENTO_FORM)
    setListaMedicamentosForm(state.listaMedicamentos ?? EMPTY_LISTA_MEDICAMENTOS_FORM)
    setPacientesPmeRows(state.pacientesPme ?? (isMedicamento ? clonePacientesPmeSeed() : []))
    setListaForm(state.listaMateriais ?? EMPTY_LISTA_MATERIAIS_FORM)
    setConsumoRows(normalizeConsumoMaterialRows(state.consumoMaterialConsignado))
    setFinalizedDivMaterialIds(new Set(state.finalizedDivMaterialIds ?? []))
    if (!isMedicamento) {
      const syncedImh = syncImhAbaFromFontes(state.imh ?? EMPTY_IMH_ABA_FORM, {
        conmed: state.conmedComrj ?? EMPTY_CONMED_COMRJ_FORM,
        consumoRows: normalizeConsumoMaterialRows(state.consumoMaterialConsignado),
      })
      setImhForm(syncedImh)
    }
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
      if (state.imh?.finalizedImhIds) {
        setImhForm((prev) => ({
          ...prev,
          finalizedImhIds: state.imh?.finalizedImhIds ?? prev.finalizedImhIds,
        }))
      }
      if (state.finalizedDivMaterialIds) {
        setFinalizedDivMaterialIds(new Set(state.finalizedDivMaterialIds))
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
          listaMateriais: patch.lista ?? listaFormRef.current,
          finalizedDivMaterialIds:
            patch.finalizedDivMaterialIds ??
            [...finalizedDivMaterialIdsRef.current],
        },
        modoRef.current,
      )
    },
    [clinicaId],
  )

  const abaAtiva = useMemo(
    () => abas.find((aba) => aba.id === abaAtivaId) ?? abas[0] ?? null,
    [abas, abaAtivaId],
  )

  const divMaterialLinhas = useMemo(
    () =>
      buildDivMaterialLinhas({
        consumoRows,
        conmed: conmedForm,
        empresas,
      }),
    [consumoRows, conmedForm, empresas],
  )

  const selectedImhCount = useMemo(() => {
    const finalized = new Set(imhForm.finalizedImhIds ?? [])
    return imhForm.linhas.filter(
      (l) => selectedImhIds.has(l.id) && !finalized.has(l.id) && linhaHasContent(l),
    ).length
  }, [imhForm, selectedImhIds])

  const selectedDivCount = useMemo(() => {
    return divMaterialLinhas.filter(
      (l) => selectedDivMaterialIds.has(l.id) && !finalizedDivMaterialIds.has(l.id),
    ).length
  }, [divMaterialLinhas, selectedDivMaterialIds, finalizedDivMaterialIds])

  const handleSheetChange = useCallback(
    (sheet: PlanilhaSheetData) => {
      const ativaId = abaAtivaIdRef.current
      if (
        !ativaId ||
        ativaId === CONMED_ABA_ID ||
        ativaId === CONSUMO_ABA_ID ||
        ativaId === LISTA_MATERIAIS_ABA_ID ||
        ativaId === DIV_MATERIAL_ABA_ID ||
        (ativaId === IMH_ABA_ID && modoRef.current === 'clinica')
      ) {
        return
      }
      if (modoRef.current === 'medicamento') return

      setAbas((prev) => {
        const next = prev.map((aba) =>
          aba.id === ativaId ? { ...aba, sheet, grid: undefined } : aba,
        )
        persist({ abas: next, abaAtivaId: ativaId })
        return next
      })
    },
    [persist],
  )

  const handleConmedChange = useCallback(
    (next: ConmedComrjFormData) => {
      setConmedForm(next)
      if (modoRef.current === 'medicamento') {
        persist({ conmed: next })
        return
      }
      const nextImh = syncImhAbaFromFontes(imhFormRef.current, {
        conmed: next,
        consumoRows: consumoRowsRef.current,
      })
      setImhForm(nextImh)
      persist({ conmed: next, imh: nextImh })
    },
    [persist],
  )

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

  const handleListaChange = useCallback(
    (next: ListaMateriaisFormData) => {
      setListaForm(next)
      persist({ lista: next })
    },
    [persist],
  )

  const handleConsumoChange = useCallback(
    (next: ConsumoMaterialRow[]) => {
      setConsumoRows(next)
      if (modoRef.current === 'medicamento') {
        persist({ consumo: next })
        return
      }
      const nextImh = syncImhAbaFromFontes(imhFormRef.current, {
        conmed: conmedFormRef.current,
        consumoRows: next,
      })
      setImhForm(nextImh)
      persist({ consumo: next, imh: nextImh })
    },
    [persist],
  )

  const handleChangeAba = (abaId: string) => {
    setAbaAtivaId(abaId)
    persist({ abaAtivaId: abaId })
  }

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
    const fluxo =
      temImh && temDiv ? 'paralelo' : temImh ? 'auditoria' : 'confeccao'

    setIsEnviando(true)
    try {
      const rowIds = [
        ...imhSelecionadas.map((l) => l.id),
        ...divSelecionadas.map((l) => l.id),
      ]
      const pedidoExistente = findPedidoParaMesmasLinhas(pedidos, rowIds, clinicaId)
      let pedidoId: string

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

      if (temImh) {
        const planilhaImh = buildImhPlanilhaFromAbaForm(imhForm, imhSelecionadas)
        pedidoPlanilhaEnvioService.saveForPedido(pedidoId, planilhaImh)
      }
      if (temDiv) {
        const planilhaControle = buildControleSolempFromDivMaterial(divSelecionadas)
        pedidoPlanilhaEnvioService.saveDivMaterialForPedido(
          pedidoId,
          divSelecionadas,
          planilhaControle,
        )
      }

      const nextImh = temImh
        ? markImhAbaLinhasFinalized(
            imhForm,
            imhSelecionadas.map((l) => l.id),
          )
        : imhForm
      const nextDivFinalized = new Set(finalizedDivMaterialIds)
      for (const linha of divSelecionadas) nextDivFinalized.add(linha.id)

      if (temImh) setImhForm(nextImh)
      if (temDiv) setFinalizedDivMaterialIds(nextDivFinalized)
      persist({
        ...(temImh ? { imh: nextImh } : {}),
        ...(temDiv ? { finalizedDivMaterialIds: [...nextDivFinalized] } : {}),
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

  const corrigirPedidoId = searchParams.get('corrigir')
  const abaCorrigir = searchParams.get('aba')

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
            value={imhMedicamentoForm}
            onChange={handleImhMedicamentoChange}
            pacientes={pacientesPmeRows}
            onPacientesChange={handlePacientesPmeChange}
            listaMedicamentos={listaMedicamentosForm}
            onListaMedicamentosChange={handleListaMedicamentosChange}
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
      return abaAtiva ? (
        <AbaVaziaPlaceholder titulo={abaAtiva.nome} />
      ) : null
    }

    if (abaAtivaId === CONSUMO_ABA_ID) {
      return (
        <ConsumoMaterialConsignadoForm value={consumoRows} onChange={handleConsumoChange} />
      )
    }
    if (abaAtivaId === CONMED_ABA_ID) {
      return <ConmedComrjForm value={conmedForm} onChange={handleConmedChange} />
    }
    if (abaAtivaId === IMH_ABA_ID) {
      return (
        <ImhAbaForm
          value={imhForm}
          onChange={handleImhChange}
          selectedImhIds={selectedImhIds}
          onSelectedImhIdsChange={setSelectedImhIds}
        />
      )
    }
    if (abaAtivaId === DIV_MATERIAL_ABA_ID) {
      return (
        <DivMaterialForm
          consumoRows={consumoRows}
          conmed={conmedForm}
          empresas={empresas}
          selectedIds={selectedDivMaterialIds}
          onSelectedIdsChange={setSelectedDivMaterialIds}
          finalizedIds={finalizedDivMaterialIds}
        />
      )
    }
    if (abaAtivaId === LISTA_MATERIAIS_ABA_ID) {
      return <ListaMateriaisForm value={listaForm} onChange={handleListaChange} />
    }
    if (abaAtiva) {
      return (
        <PlanilhaBrancaSpreadsheet
          nome={abaAtiva.nome}
          sheet={resolveAbaSheet(abaAtiva)}
          onSheetChange={handleSheetChange}
        />
      )
    }
    return null
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
          {!isMedicamento && tabsSource.some((a) => a.id === DIV_MATERIAL_ABA_ID) ? (
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
              Enviar planilha
            </Button>
          ) : null}
        </Box>
      </Box>

      {renderContent()}

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
