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
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import type { ConmedComrjFormData, Empresa } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  buildDivMaterialLinhas,
  DIV_MATERIAL_COLUNAS,
} from '@/utils/divMaterialForm'
import '@/components/clinica/spreadsheet-excel.css'

interface DivMaterialFormProps {
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
      }),
    [consumoRows, conmed, empresas],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Alert severity="info" sx={{ py: 0.5 }}>
        Somente leitura — espelha automaticamente o Consumo Material Consignado e o CONMED COMRJ
        pela NIP do paciente. NIPs iguais são separados pela data do procedimento.
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
                    {DIV_MATERIAL_COLUNAS.map((col) => (
                      <TableCell
                        key={col.key}
                        sx={{
                          ...cellSx,
                          minWidth: col.width,
                          whiteSpace: col.key === 'descricaoMaterial' ? 'normal' : 'nowrap',
                        }}
                      >
                        {dash(String(linha[col.key] ?? ''))}
                      </TableCell>
                    ))}
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
