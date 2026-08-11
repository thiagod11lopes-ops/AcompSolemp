import {
  Box,
  Button,
  IconButton,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicaAuth } from '@/contexts/AuthContext'
import {
  NovaPlanilhaModal,
  type NovaPlanilhaInput,
} from '@/components/clinica/NovaPlanilhaModal'
import { PlanilhaBrancaSpreadsheet } from '@/components/clinica/PlanilhaBrancaSpreadsheet'
import { clinicaPlanilhasLivresService } from '@/services/clinicaPlanilhasLivresService'
import type { PlanilhaLivreAba } from '@/types'
import { parseSpreadsheetGridFile } from '@/utils/consumoMaterialOds'
import {
  createEmptySpreadsheetGrid,
  gridFromImportedRows,
} from '@/utils/planilhaBrancaGrid'

export default function ClinicaNovoPedidoPage() {
  const { navigatePortal } = usePortalPaths()
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''

  const [abas, setAbas] = useState<PlanilhaLivreAba[]>([])
  const [abaAtivaId, setAbaAtivaId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    setAbaAtivaId(state.abaAtivaId)
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
    () => abas.find((aba) => aba.id === abaAtivaId) ?? null,
    [abas, abaAtivaId],
  )

  const handleConfirm = async (input: NovaPlanilhaInput) => {
    setError(null)
    setIsLoading(true)
    try {
      let grid = createEmptySpreadsheetGrid()
      if (input.modo === 'importar') {
        if (!input.file) {
          setError('Selecione um arquivo .ods ou .xlsx.')
          throw new Error('no file')
        }
        const rows = await parseSpreadsheetGridFile(input.file)
        if (rows.length === 0) {
          setError('Nenhuma célula encontrada no arquivo.')
          throw new Error('empty')
        }
        grid = gridFromImportedRows(rows)
      }

      const nova: PlanilhaLivreAba = {
        id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nome: input.nome.trim() || 'Planilha',
        grid,
      }
      setAbas((prev) => {
        const next = [...prev, nova]
        persist(next, nova.id)
        return next
      })
      setAbaAtivaId(nova.id)
      setModalOpen(false)
    } catch (err) {
      if (
        err instanceof Error &&
        err.message !== 'no file' &&
        err.message !== 'empty'
      ) {
        setError(err.message || 'Erro ao abrir a planilha.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGridChange = useCallback(
    (grid: string[][]) => {
      const ativaId = abaAtivaIdRef.current
      if (!ativaId) return
      setAbas((prev) => {
        const next = prev.map((aba) => (aba.id === ativaId ? { ...aba, grid } : aba))
        persist(next, ativaId)
        return next
      })
    },
    [persist],
  )

  const handleFecharAba = (abaId: string) => {
    setAbas((prev) => {
      const next = prev.filter((aba) => aba.id !== abaId)
      const nextAtiva =
        abaAtivaIdRef.current === abaId
          ? (next[next.length - 1]?.id ?? null)
          : abaAtivaIdRef.current
      if (abaAtivaIdRef.current === abaId) setAbaAtivaId(nextAtiva)
      persist(next, nextAtiva)
      return next
    })
  }

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
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2, mr: 'auto' }}>
            Planilhas
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setError(null)
              setModalOpen(true)
            }}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Adicionar nova Planilha
          </Button>
        </Box>

        {abas.length > 0 && (
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
              value={abaAtivaId ?? false}
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
              {abas.map((aba) => (
                <Tab
                  key={aba.id}
                  value={aba.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                        {aba.nome}
                      </Typography>
                      <IconButton
                        size="small"
                        component="span"
                        aria-label={`Fechar ${aba.nome}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFecharAba(aba.id)
                        }}
                        sx={{ p: 0.25 }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>
        )}
      </Box>

      {abaAtiva ? (
        <PlanilhaBrancaSpreadsheet
          nome={abaAtiva.nome}
          grid={abaAtiva.grid}
          onGridChange={handleGridChange}
        />
      ) : (
        <Box
          sx={(theme) => ({
            mt: 4,
            py: 6,
            textAlign: 'center',
            color: 'text.secondary',
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.25)}`,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          })}
        >
          <Typography variant="body1" sx={{ mb: 2 }}>
            Nenhuma planilha aberta.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setError(null)
              setModalOpen(true)
            }}
            sx={{ fontWeight: 700 }}
          >
            Adicionar nova Planilha
          </Button>
        </Box>
      )}

      <NovaPlanilhaModal
        open={modalOpen}
        isLoading={isLoading}
        error={error}
        onClose={() => {
          if (!isLoading) setModalOpen(false)
        }}
        onConfirm={handleConfirm}
      />
    </>
  )
}
