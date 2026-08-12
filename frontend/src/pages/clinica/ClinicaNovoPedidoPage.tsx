import {
  Box,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { useClinicas } from '@/hooks/useCadastros'
import { PlanilhaBrancaSpreadsheet } from '@/components/clinica/PlanilhaBrancaSpreadsheet'
import { ConmedComrjForm } from '@/components/clinica/ConmedComrjForm'
import { ConsumoMaterialConsignadoForm } from '@/components/clinica/ConsumoMaterialConsignadoForm'
import { ImhAbaForm } from '@/components/clinica/ImhAbaForm'
import { ImhMedicamentoForm } from '@/components/clinica/ImhMedicamentoForm'
import { ListaMateriaisForm } from '@/components/clinica/ListaMateriaisForm'
import { ListaMedicamentosForm } from '@/components/clinica/ListaMedicamentosForm'
import {
  clinicaPlanilhasLivresService,
  resolveAbaSheet,
} from '@/services/clinicaPlanilhasLivresService'
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
import { EMPTY_IMH_ABA_FORM } from '@/utils/imhAbaForm'
import { EMPTY_IMH_MEDICAMENTO_FORM } from '@/utils/imhMedicamentoForm'
import { EMPTY_LISTA_MATERIAIS_FORM } from '@/utils/listaMateriaisForm'
import { EMPTY_LISTA_MEDICAMENTOS_FORM } from '@/utils/listaMedicamentosForm'
import {
  normalizeConsumoMaterialRows,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import { type PlanilhaSheetData } from '@/utils/planilhaBrancaGrid'

const CONMED_ABA_ID = 'conmed-comrj'
const CONSUMO_ABA_ID = 'consumo-material-consignado'
const IMH_ABA_ID = 'imh'
const LISTA_MATERIAIS_ABA_ID = 'lista-de-materiais'
const LISTA_MEDICAMENTOS_ABA_ID = 'lista-de-medicamentos'

type PersistPayload = {
  abas?: PlanilhaLivreAba[]
  abaAtivaId?: string | null
  conmed?: ConmedComrjFormData
  consumo?: ConsumoMaterialRow[]
  imh?: ImhAbaFormData
  imhMedicamento?: ImhMedicamentoFormData
  listaMedicamentos?: ListaMedicamentosFormData
  lista?: ListaMateriaisFormData
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
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''
  const { data: clinicas = [] } = useClinicas()
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
  const [listaForm, setListaForm] = useState<ListaMateriaisFormData>(EMPTY_LISTA_MATERIAIS_FORM)
  const [consumoRows, setConsumoRows] = useState<ConsumoMaterialRow[]>([])
  const hydratedModoRef = useRef<string | null>(null)
  const abasRef = useRef(abas)
  const abaAtivaIdRef = useRef(abaAtivaId)
  const conmedFormRef = useRef(conmedForm)
  const imhFormRef = useRef(imhForm)
  const imhMedicamentoFormRef = useRef(imhMedicamentoForm)
  const listaMedicamentosFormRef = useRef(listaMedicamentosForm)
  const listaFormRef = useRef(listaForm)
  const consumoRowsRef = useRef(consumoRows)
  const modoRef = useRef(planilhasModo)
  abasRef.current = abas
  abaAtivaIdRef.current = abaAtivaId
  conmedFormRef.current = conmedForm
  imhFormRef.current = imhForm
  imhMedicamentoFormRef.current = imhMedicamentoForm
  listaMedicamentosFormRef.current = listaMedicamentosForm
  listaFormRef.current = listaForm
  consumoRowsRef.current = consumoRows
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
    setListaForm(state.listaMateriais ?? EMPTY_LISTA_MATERIAIS_FORM)
    setConsumoRows(normalizeConsumoMaterialRows(state.consumoMaterialConsignado))
  }, [clinicaId, planilhasModo, fixedPlanilhas])

  const persist = useCallback(
    (patch: PersistPayload = {}) => {
      if (!clinicaId) return
      clinicaPlanilhasLivresService.saveState(
        clinicaId,
        {
          abas: patch.abas ?? abasRef.current,
          abaAtivaId:
            patch.abaAtivaId !== undefined ? patch.abaAtivaId : abaAtivaIdRef.current,
          conmedComrj: patch.conmed ?? conmedFormRef.current,
          consumoMaterialConsignado: patch.consumo ?? consumoRowsRef.current,
          imh: patch.imh ?? imhFormRef.current,
          imhMedicamento: patch.imhMedicamento ?? imhMedicamentoFormRef.current,
          listaMedicamentos: patch.listaMedicamentos ?? listaMedicamentosFormRef.current,
          listaMateriais: patch.lista ?? listaFormRef.current,
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

  const handleSheetChange = useCallback(
    (sheet: PlanilhaSheetData) => {
      const ativaId = abaAtivaIdRef.current
      if (
        !ativaId ||
        ativaId === CONMED_ABA_ID ||
        ativaId === CONSUMO_ABA_ID ||
        ativaId === LISTA_MATERIAIS_ABA_ID ||
        (ativaId === IMH_ABA_ID && modoRef.current === 'clinica')
      ) {
        return
      }
      // Medicamento: abas ainda sem edição de conteúdo.
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
      persist({ conmed: next })
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
      persist({ consumo: next })
    },
    [persist],
  )

  const handleChangeAba = (abaId: string) => {
    setAbaAtivaId(abaId)
    persist({ abaAtivaId: abaId })
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
            value={imhMedicamentoForm}
            onChange={handleImhMedicamentoChange}
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
      return <ImhAbaForm value={imhForm} onChange={handleImhChange} />
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
          })}
        >
          <Tabs
            value={tabValue}
            onChange={(_, value: string) => handleChangeAba(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 42,
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
        </Box>
      </Box>

      {renderContent()}
    </>
  )
}
