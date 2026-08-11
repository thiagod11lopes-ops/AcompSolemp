import {
  Box,
  Button,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { PlanilhaBrancaSpreadsheet } from '@/components/clinica/PlanilhaBrancaSpreadsheet'
import {
  clinicaPlanilhasLivresService,
  resolveAbaSheet,
} from '@/services/clinicaPlanilhasLivresService'
import type { PlanilhaLivreAba } from '@/types'
import { FIXED_PLANILHAS } from '@/utils/planilhasFixas'
import { type PlanilhaSheetData } from '@/utils/planilhaBrancaGrid'

export default function ClinicaNovoPedidoPage() {
  const { navigatePortal } = usePortalPaths()
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''

  const [abas, setAbas] = useState<PlanilhaLivreAba[]>([])
  const [abaAtivaId, setAbaAtivaId] = useState<string | null>(FIXED_PLANILHAS[0].id)
  const hydrated = useRef(false)
  const abasRef = useRef(abas)
  const abaAtivaIdRef = useRef(abaAtivaId)
  abasRef.current = abas
  abaAtivaIdRef.current = abaAtivaId

  useEffect(() => {
    if (!clinicaId || hydrated.current) return
    hydrated.current = true
    const state = clinicaPlanilhasLivresService.getState(clinicaId)
    setAbas(state.abas)
    setAbaAtivaId(state.abaAtivaId ?? FIXED_PLANILHAS[0].id)
  }, [clinicaId])

  const persist = useCallback(
    (nextAbas: PlanilhaLivreAba[], nextAtiva: string | null) => {
      if (!clinicaId) return
      clinicaPlanilhasLivresService.saveState(clinicaId, {
        abas: nextAbas,
        abaAtivaId: nextAtiva,
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
      if (!ativaId) return
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

  const handleChangeAba = (abaId: string) => {
    setAbaAtivaId(abaId)
    persist(abasRef.current, abaId)
  }

  return (
    <>
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigatePortal('/clinica/pedidos')}
            sx={{ minWidth: 0, px: 1, py: 0.25, flexShrink: 0 }}
          >
            Voltar
          </Button>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Planilhas
          </Typography>
        </Box>

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

      {abaAtiva ? (
        <PlanilhaBrancaSpreadsheet
          nome={abaAtiva.nome}
          sheet={resolveAbaSheet(abaAtiva)}
          onSheetChange={handleSheetChange}
        />
      ) : null}
    </>
  )
}
