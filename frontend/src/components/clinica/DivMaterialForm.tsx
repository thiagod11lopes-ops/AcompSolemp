import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import type { ConmedComrjFormData, Empresa } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  buildDivMaterialLinhas,
  DIV_MATERIAL_COLUNAS,
  isDivMaterialEditable,
  setDivMaterialOverride,
  type DivMaterialColunaKey,
  type DivMaterialFormData,
} from '@/utils/divMaterialForm'
import '@/components/clinica/spreadsheet-excel.css'

interface DivMaterialFormProps {
  value: DivMaterialFormData
  onChange: (next: DivMaterialFormData) => void
  consumoRows: ConsumoMaterialRow[]
  conmed?: ConmedComrjFormData
  empresas?: Empresa[]
}

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

const cellSx = {
  border: EXCEL_SHEET.border,
  fontFamily: EXCEL_SHEET.fontFamily,
  fontSize: EXCEL_SHEET.fontSize,
  py: 0.5,
  px: 0.75,
  color: EXCEL_SHEET.text,
  bgcolor: EXCEL_SHEET.cellBg,
  verticalAlign: 'middle' as const,
} as const

const headerSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: 700,
  color: EXCEL_SHEET.mutedText,
  whiteSpace: 'nowrap' as const,
} as const

export function DivMaterialForm({
  value,
  onChange,
  consumoRows,
  conmed,
  empresas = [],
}: DivMaterialFormProps) {
  const linhas = useMemo(
    () =>
      buildDivMaterialLinhas({
        consumoRows,
        conmed,
        empresas,
        form: value,
      }),
    [consumoRows, conmed, empresas, value],
  )

  const handleCellChange = (
    sourceKey: string,
    field: DivMaterialColunaKey,
    nextValue: string,
  ) => {
    if (!isDivMaterialEditable(field)) return
    if (field === 'nip' || field === 'nomePaciente' || field === 'dataProcedimento') return
    onChange(setDivMaterialOverride(value, sourceKey, field, nextValue))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Alert severity="info" sx={{ py: 0.5 }}>
        Preenchimento automático a partir do Consumo Material Consignado e do CONMED COMRJ, pela
        NIP do paciente. NIPs iguais são separados pela data do procedimento. Campos sem fonte
        (UASG, NUP SIGAD etc.) podem ser preenchidos manualmente.
      </Alert>

      <Paper
        variant="outlined"
        className="spreadsheet-excel-scroll"
        sx={{
          borderColor: EXCEL_SHEET.borderColor,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: EXCEL_SHEET.border,
            bgcolor: EXCEL_SHEET.headerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 13, fontFamily: EXCEL_SHEET.fontFamily }}>
            Div. Material — processos por NIP / data
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {linhas.length} registro(s)
          </Typography>
        </Box>

        {linhas.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhum paciente encontrado. Cadastre lançamentos na aba Consumo Material Consignado
              (ou CONMED) para preencher esta tabela automaticamente.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 'min(70vh, 720px)' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1800 }}>
              <TableHead>
                <TableRow>
                  {DIV_MATERIAL_COLUNAS.map((col) => (
                    <TableCell
                      key={col.key}
                      sx={{ ...headerSx, minWidth: col.width, top: 0, zIndex: 2 }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {linhas.map((linha) => (
                  <TableRow key={linha.id} hover>
                    {DIV_MATERIAL_COLUNAS.map((col) => {
                      const raw = String(linha[col.key] ?? '')
                      const editable = isDivMaterialEditable(col.key)
                      return (
                        <TableCell
                          key={col.key}
                          sx={{
                            ...cellSx,
                            minWidth: col.width,
                            whiteSpace: col.key === 'descricaoMaterial' ? 'normal' : 'nowrap',
                          }}
                        >
                          {editable ? (
                            <TextField
                              size="small"
                              fullWidth
                              value={raw}
                              placeholder="—"
                              onChange={(e) =>
                                handleCellChange(linha.sourceKey, col.key, e.target.value)
                              }
                              variant="standard"
                              sx={{
                                '& .MuiInputBase-root': {
                                  fontSize: EXCEL_SHEET.fontSize,
                                  fontFamily: EXCEL_SHEET.fontFamily,
                                  '&:before, &:after': { display: 'none' },
                                },
                                '& .MuiInputBase-input': { py: 0.35, px: 0.5 },
                              }}
                            />
                          ) : (
                            dash(raw)
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
