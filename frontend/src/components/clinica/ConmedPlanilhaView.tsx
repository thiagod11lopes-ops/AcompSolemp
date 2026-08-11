import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CONMED_EXEMPLO_NOME,
  loadConmedExemploBundled,
  type ConmedSheet,
} from '@/utils/conmedOds'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import '@/components/clinica/spreadsheet-excel.css'

interface ConmedPlanilhaViewProps {
  headerExtra?: ReactNode
}

export function ConmedPlanilhaView({ headerExtra }: ConmedPlanilhaViewProps) {
  const [sheets, setSheets] = useState<ConmedSheet[]>([])
  const [abaAtiva, setAbaAtiva] = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErro(null)
    loadConmedExemploBundled()
      .then((data) => {
        if (cancelled) return
        setSheets(data)
        setAbaAtiva(0)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setErro(err instanceof Error ? err.message : 'Erro ao carregar CONMED.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sheet = sheets[abaAtiva] ?? null
  const colCount = useMemo(() => {
    if (!sheet) return 0
    return sheet.rows.reduce((max, row) => Math.max(max, row.length), 0)
  }, [sheet])

  return (
    <Paper
      elevation={0}
      className="excel-sheet"
      sx={{
        border: EXCEL_SHEET.border,
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: EXCEL_SHEET.sheetBg,
      }}
    >
      <Box className="excel-sheet-toolbar" sx={{ px: 2, py: 1.25 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: EXCEL_SHEET.text }}>
              CONMED
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
              <Chip
                label={CONMED_EXEMPLO_NOME}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  maxWidth: 420,
                  borderColor: EXCEL_SHEET.borderColor,
                  bgcolor: '#fff',
                }}
              />
              {sheet && (
                <Chip
                  label={`${sheet.rows.length} linhas · ${colCount} colunas`}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: EXCEL_SHEET.borderColor, bgcolor: '#fff' }}
                />
              )}
            </Box>
          </Box>
          {headerExtra}
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && erro && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">{erro}</Alert>
        </Box>
      )}

      {!loading && !erro && sheets.length > 0 && (
        <>
          <Tabs
            value={abaAtiva}
            onChange={(_, value: number) => setAbaAtiva(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              borderBottom: `1px solid ${EXCEL_SHEET.borderColor}`,
              bgcolor: '#f3f4f6',
              '& .MuiTab-root': {
                minHeight: 36,
                textTransform: 'none',
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
              },
            }}
          >
            {sheets.map((item) => (
              <Tab key={item.name} label={item.name} />
            ))}
          </Tabs>

          <TableContainer sx={{ maxHeight: '70vh', bgcolor: '#fff' }}>
            <Table stickyHeader size="small" sx={{ minWidth: Math.max(colCount * 120, 640) }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      width: 44,
                      bgcolor: '#e5e7eb',
                      color: '#6b7280',
                      fontWeight: 700,
                      fontSize: 11,
                      borderRight: `1px solid ${EXCEL_SHEET.borderColor}`,
                    }}
                  >
                    #
                  </TableCell>
                  {Array.from({ length: colCount }, (_, index) => (
                    <TableCell
                      key={`col-${index}`}
                      sx={{
                        bgcolor: '#e5e7eb',
                        color: '#374151',
                        fontWeight: 700,
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {columnLabel(index)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sheet?.rows.map((row, rowIndex) => (
                  <TableRow key={`row-${rowIndex}`} hover>
                    <TableCell
                      sx={{
                        bgcolor: '#f9fafb',
                        color: '#6b7280',
                        fontSize: 11,
                        borderRight: `1px solid ${EXCEL_SHEET.borderColor}`,
                      }}
                    >
                      {rowIndex + 1}
                    </TableCell>
                    {Array.from({ length: colCount }, (_, colIndex) => (
                      <TableCell
                        key={`cell-${rowIndex}-${colIndex}`}
                        sx={{
                          fontSize: 11,
                          fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
                          color: EXCEL_SHEET.text,
                          whiteSpace: 'pre-wrap',
                          verticalAlign: 'top',
                          maxWidth: 320,
                        }}
                      >
                        {row[colIndex] ?? ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  )
}

function columnLabel(index: number): string {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}
