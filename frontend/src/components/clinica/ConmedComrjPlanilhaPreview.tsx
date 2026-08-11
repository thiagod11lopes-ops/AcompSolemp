import { Box, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import type { ConmedComrjFormData } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  conmedFormHasPreviewContent,
  conmedProcessoSheetTitle,
} from '@/utils/conmedComrjForm'
import '@/components/clinica/spreadsheet-excel.css'

interface ConmedComrjPlanilhaPreviewProps {
  value: ConmedComrjFormData
}

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

const cellSx = {
  border: EXCEL_SHEET.border,
  fontFamily: EXCEL_SHEET.fontFamily,
  fontSize: EXCEL_SHEET.fontSize,
  py: 0.75,
  px: 1,
  color: EXCEL_SHEET.text,
  bgcolor: EXCEL_SHEET.cellBg,
  verticalAlign: 'middle' as const,
} as const

const labelCellSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: 700,
  color: EXCEL_SHEET.mutedText,
  whiteSpace: 'nowrap' as const,
}

const groupSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.groupBg,
  fontWeight: 800,
  letterSpacing: 0.4,
  py: 1,
}

const headerSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
}

const PATIENT_COLS = 4
const MATERIAL_COLS = 9
const TOTAL_COLS = PATIENT_COLS + MATERIAL_COLS

export function ConmedComrjPlanilhaPreview({ value }: ConmedComrjPlanilhaPreviewProps) {
  const visible = conmedFormHasPreviewContent(value)
  const title = conmedProcessoSheetTitle(value)
  const materiais = value.materiais
  const materialCount = materiais.length
  const patientRowSpan = Math.max(materialCount, 1)

  return (
    <Box
      sx={{
        opacity: visible ? 1 : 0.45,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 280ms ease, transform 280ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Paper
        elevation={0}
        className="excel-sheet"
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
          boxShadow: visible
            ? '0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)'
            : 'none',
          bgcolor: EXCEL_SHEET.sheetBg,
        }}
      >
        <Box
          className="excel-sheet-toolbar"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            px: 1.5,
            py: 1,
            background: `linear-gradient(180deg, ${EXCEL_SHEET.toolbarBg} 0%, #ebebeb 100%)`,
          }}
        >
          <Typography
            sx={{
              fontFamily: EXCEL_SHEET.fontFamily,
              fontWeight: 800,
              fontSize: 13,
              color: EXCEL_SHEET.selectedCheck,
            }}
          >
            CONMED COMRJ
          </Typography>
          <Chip
            size="small"
            label={title}
            sx={{
              height: 22,
              fontWeight: 700,
              bgcolor: '#e8f5e9',
              color: EXCEL_SHEET.selectedCheck,
              border: `1px solid ${EXCEL_SHEET.selectedCheck}33`,
            }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`${materialCount} material(is)`}
            sx={{ height: 22, fontWeight: 600 }}
          />
          <Box sx={{ flex: 1 }} />
          <Typography
            sx={{
              fontFamily: EXCEL_SHEET.fontFamily,
              fontSize: 12,
              fontWeight: 700,
              color: EXCEL_SHEET.text,
            }}
          >
            Valor por paciente:{' '}
            <Box component="span" sx={{ color: EXCEL_SHEET.selectedCheck }}>
              {dash(value.valorPorPaciente)}
            </Box>
          </Typography>
        </Box>

        {!visible ? (
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Preencha os dados do processo, do paciente e dos materiais para ver a planilha
              unificada deste processo.
            </Typography>
          </Box>
        ) : (
          <Box className="excel-sheet-grid excel-sheet-wrap" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ width: '100%', minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell colSpan={TOTAL_COLS} sx={groupSx}>
                    DADOS DO PROCESSO
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={labelCellSx}>Nº</TableCell>
                  <TableCell colSpan={3} sx={cellSx}>
                    {dash(value.numero)}
                  </TableCell>
                  <TableCell sx={labelCellSx}>DATA</TableCell>
                  <TableCell colSpan={3} sx={cellSx}>
                    {dash(value.data)}
                  </TableCell>
                  <TableCell sx={labelCellSx}>PROCESSO</TableCell>
                  <TableCell colSpan={4} sx={cellSx}>
                    {dash(value.processo)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={labelCellSx}>PREGÃO/TAD</TableCell>
                  <TableCell colSpan={3} sx={cellSx}>
                    {dash(value.pregaoTad)}
                  </TableCell>
                  <TableCell sx={labelCellSx}>VIGÊNCIA</TableCell>
                  <TableCell colSpan={3} sx={cellSx}>
                    {dash(value.vigencia)}
                  </TableCell>
                  <TableCell sx={labelCellSx}>FORNECEDOR</TableCell>
                  <TableCell colSpan={4} sx={cellSx}>
                    {dash(value.fornecedor)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={PATIENT_COLS} sx={groupSx}>
                    DADOS DO PACIENTE
                  </TableCell>
                  <TableCell colSpan={MATERIAL_COLS} sx={groupSx}>
                    DADOS DO MATERIAL
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={headerSx}>NIP</TableCell>
                  <TableCell sx={headerSx}>INICIAIS</TableCell>
                  <TableCell sx={headerSx}>DATA</TableCell>
                  <TableCell sx={headerSx}>PROCEDIMENTO</TableCell>
                  <TableCell sx={headerSx}>#</TableCell>
                  <TableCell sx={headerSx}>MAPA DA SALA</TableCell>
                  <TableCell sx={headerSx}>DANFE</TableCell>
                  <TableCell sx={headerSx}>ITEM</TableCell>
                  <TableCell sx={headerSx}>NEB/PI</TableCell>
                  <TableCell sx={headerSx}>DESCRIÇÃO DO MATERIAL</TableCell>
                  <TableCell sx={headerSx}>QT</TableCell>
                  <TableCell sx={headerSx}>VALOR UNIT</TableCell>
                  <TableCell sx={headerSx}>VALOR TOTAL</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {materiais.map((mat, index) => (
                  <TableRow
                    key={mat.id}
                    sx={{
                      '&:hover td': { bgcolor: EXCEL_SHEET.hoverBg },
                    }}
                  >
                    {index === 0 ? (
                      <>
                        <TableCell
                          rowSpan={patientRowSpan}
                          sx={{ ...cellSx, fontWeight: 600, bgcolor: '#fbfcfe' }}
                        >
                          {dash(value.pacienteNip)}
                        </TableCell>
                        <TableCell
                          rowSpan={patientRowSpan}
                          sx={{ ...cellSx, fontWeight: 600, bgcolor: '#fbfcfe' }}
                        >
                          {dash(value.pacienteIniciais)}
                        </TableCell>
                        <TableCell
                          rowSpan={patientRowSpan}
                          sx={{ ...cellSx, fontWeight: 600, bgcolor: '#fbfcfe' }}
                        >
                          {dash(value.pacienteData)}
                        </TableCell>
                        <TableCell
                          rowSpan={patientRowSpan}
                          sx={{ ...cellSx, fontWeight: 600, bgcolor: '#fbfcfe', minWidth: 140 }}
                        >
                          {dash(value.pacienteProcedimento)}
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell sx={{ ...cellSx, fontWeight: 700, width: 36 }}>{index + 1}</TableCell>
                    <TableCell sx={cellSx}>{dash(mat.mapaDaSala)}</TableCell>
                    <TableCell sx={cellSx}>{dash(mat.danfe)}</TableCell>
                    <TableCell sx={cellSx}>{dash(mat.item)}</TableCell>
                    <TableCell sx={cellSx}>{dash(mat.nebPi)}</TableCell>
                    <TableCell sx={{ ...cellSx, minWidth: 160 }}>{dash(mat.descricao)}</TableCell>
                    <TableCell sx={cellSx}>{dash(mat.qt)}</TableCell>
                    <TableCell sx={cellSx}>{dash(mat.valorUnit)}</TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{dash(mat.valorTotal)}</TableCell>
                  </TableRow>
                ))}

                <TableRow>
                  <TableCell
                    colSpan={TOTAL_COLS - 1}
                    sx={{
                      ...cellSx,
                      bgcolor: EXCEL_SHEET.selectHeaderBg,
                      fontWeight: 800,
                      textAlign: 'right',
                    }}
                  >
                    VALOR POR PACIENTE
                  </TableCell>
                  <TableCell
                    sx={{
                      ...cellSx,
                      bgcolor: '#e8f5e9',
                      fontWeight: 800,
                      color: EXCEL_SHEET.selectedCheck,
                    }}
                  >
                    {dash(value.valorPorPaciente)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
