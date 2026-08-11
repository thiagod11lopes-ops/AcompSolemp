import {
  Box,
  Tab,
  Tabs,
  alpha,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { PlanilhaBrancaSpreadsheet } from '@/components/clinica/PlanilhaBrancaSpreadsheet'
import { ConmedComrjForm } from '@/components/clinica/ConmedComrjForm'
import { ConsumoMaterialConsignadoForm } from '@/components/clinica/ConsumoMaterialConsignadoForm'
import { ImhAbaForm } from '@/components/clinica/ImhAbaForm'
import {
  clinicaPlanilhasLivresService,
  resolveAbaSheet,
} from '@/services/clinicaPlanilhasLivresService'
import type { ConmedComrjFormData, ImhAbaFormData, PlanilhaLivreAba } from '@/types'
import { FIXED_PLANILHAS } from '@/utils/planilhasFixas'
import { EMPTY_CONMED_COMRJ_FORM } from '@/utils/conmedComrjForm'
import { EMPTY_IMH_ABA_FORM } from '@/utils/imhAbaForm'
import {
  normalizeConsumoMaterialRows,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import { type PlanilhaSheetData } from '@/utils/planilhaBrancaGrid'

const CONMED_ABA_ID = 'conmed-comrj'
const CONSUMO_ABA_ID = 'consumo-material-consignado'
const IMH_ABA_ID = 'imh'

export default function ClinicaNovoPedidoPage() {
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''

  const [abas, setAbas] = useState<PlanilhaLivreAba[]>([])
  const [abaAtivaId, setAbaAtivaId] = useState<string | null>(FIXED_PLANILHAS[0].id)
  const [conmedForm, setConmedForm] = useState<ConmedComrjFormData>(EMPTY_CONMED_COMRJ_FORM)
  const [imhForm, setImhForm] = useState<ImhAbaFormData>(EMPTY_IMH_ABA_FORM)
  const [consumoRows, setConsumoRows] = useState<ConsumoMaterialRow[]>([])
  const hydrated = useRef(false)
  const abasRef = useRef(abas)
  const abaAtivaIdRef = useRef(abaAtivaId)
  const conmedFormRef = useRef(conmedForm)
  const imhFormRef = useRef(imhForm)
  const consumoRowsRef = useRef(consumoRows)
  abasRef.current = abas
  abaAtivaIdRef.current = abaAtivaId
  conmedFormRef.current = conmedForm
  imhFormRef.current = imhForm
  consumoRowsRef.current = consumoRows

  useEffect(() => {
    if (!clinicaId || hydrated.current) return
    hydrated.current = true
    const state = clinicaPlanilhasLivresService.getState(clinicaId)
    setAbas(state.abas)
    setAbaAtivaId(state.abaAtivaId ?? FIXED_PLANILHAS[0].id)
    setConmedForm(state.conmedComrj ?? EMPTY_CONMED_COMRJ_FORM)
    setImhForm(state.imh ?? EMPTY_IMH_ABA_FORM)
    setConsumoRows(normalizeConsumoMaterialRows(state.consumoMaterialConsignado))
  }, [clinicaId])

  const persist = useCallback(
    (
      nextAbas: PlanilhaLivreAba[],
      nextAtiva: string | null,
      nextConmed: ConmedComrjFormData = conmedFormRef.current,
      nextConsumo: ConsumoMaterialRow[] = consumoRowsRef.current,
      nextImh: ImhAbaFormData = imhFormRef.current,
    ) => {
      if (!clinicaId) return
      clinicaPlanilhasLivresService.saveState(clinicaId, {
        abas: nextAbas,
        abaAtivaId: nextAtiva,
        conmedComrj: nextConmed,
        consumoMaterialConsignado: nextConsumo,
        imh: nextImh,
      })
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
        ativaId === IMH_ABA_ID
      ) {
        return
      }
      setAbas((prev) => {
        const next = prev.map((aba) =>
          aba.id === ativaId ? { ...aba, sheet, grid: undefined } : aba,
        )
        persist(next, ativaId)
        return next
      })
    },
    [persist],
  )

  const handleConmedChange = useCallback(
    (next: ConmedComrjFormData) => {
      setConmedForm(next)
      persist(abasRef.current, abaAtivaIdRef.current, next, consumoRowsRef.current, imhFormRef.current)
    },
    [persist],
  )

  const handleImhChange = useCallback(
    (next: ImhAbaFormData) => {
      setImhForm(next)
      persist(
        abasRef.current,
        abaAtivaIdRef.current,
        conmedFormRef.current,
        consumoRowsRef.current,
        next,
      )
    },
    [persist],
  )

  const handleConsumoChange = useCallback(
    (next: ConsumoMaterialRow[]) => {
      setConsumoRows(next)
      persist(
        abasRef.current,
        abaAtivaIdRef.current,
        conmedFormRef.current,
        next,
        imhFormRef.current,
      )
    },
    [persist],
  )

  const handleChangeAba = (abaId: string) => {
    setAbaAtivaId(abaId)
    persist(abasRef.current, abaId)
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
            value={abaAtivaId ?? FIXED_PLANILHAS[0].id}
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
            {(abas.length ? abas : FIXED_PLANILHAS.map((f) => ({ id: f.id, nome: f.nome }))).map(
              (aba) => (
                <Tab key={aba.id} value={aba.id} label={aba.nome} />
              ),
            )}
          </Tabs>
        </Box>
      </Box>

      {abaAtivaId === CONSUMO_ABA_ID ? (
        <ConsumoMaterialConsignadoForm value={consumoRows} onChange={handleConsumoChange} />
      ) : abaAtivaId === CONMED_ABA_ID ? (
        <ConmedComrjForm value={conmedForm} onChange={handleConmedChange} />
      ) : abaAtivaId === IMH_ABA_ID ? (
        <ImhAbaForm value={imhForm} onChange={handleImhChange} />
      ) : abaAtiva ? (
        <PlanilhaBrancaSpreadsheet
          nome={abaAtiva.nome}
          sheet={resolveAbaSheet(abaAtiva)}
          onSheetChange={handleSheetChange}
        />
      ) : null}
    </>
  )
}
