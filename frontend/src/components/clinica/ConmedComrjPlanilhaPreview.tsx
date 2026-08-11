import { Fragment } from 'react'
import { DeleteOutlined as DeleteIcon, EditOutlined as EditIcon } from '@mui/icons-material'
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { ConmedComrjFormData, ConmedComrjPaciente } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  conmedFormHasPreviewContent,
  conmedProcessoSheetTitle,
  countConmedMateriais,
} from '@/utils/conmedComrjForm'
import '@/components/clinica/spreadsheet-excel.css'

interface ConmedComrjPlanilhaPreviewProps {
  value: ConmedComrjFormData
  editingPacienteId?: string | null
  editingMaterialId?: string | null
  onEditPaciente?: (pacienteId: string) => void
  onDeletePaciente?: (pacienteId: string) => void
  onEditMaterial?: (pacienteId: string, materialId: string) => void
  onDeleteMaterial?: (pacienteId: string, materialId: string) => void
}

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

function wrapEveryChars(value: string, chars = 100): string {
  const text = value.trim()
  if (!text) return '—'
  if (text.length <= chars) return text
  const parts: string[] = []
  for (let i = 0; i < text.length; i += chars) {
    parts.push(text.slice(i, i + chars))
  }
  return parts.join('\n')
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
  width: 120,
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

/** paciente (4) + ações pac (1) + material sem # (8) + ações mat (1) */
const PATIENT_COLS = 5
const MATERIAL_COLS = 9
const TOTAL_COLS = PATIENT_COLS + MATERIAL_COLS

function patientRowSpan(paciente: ConmedComrjPaciente): number {
  return Math.max(paciente.materiais.length, 1)
}

export function ConmedComrjPlanilhaPreview({
  value,
  editingPacienteId = null,
  editingMaterialId = null,
  onEditPaciente,
  onDeletePaciente,
  onEditMaterial,
  onDeleteMaterial,
}: ConmedComrjPlanilhaPreviewProps) {
  const visible = conmedFormHasPreviewContent(value)
  const title = conmedProcessoSheetTitle(value)
  const pacientes = value.pacientes
  const materialCount = countConmedMateriais(value)

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
            label={`${pacientes.length} paciente(s)`}
            sx={{ height: 22, fontWeight: 600 }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`${materialCount} material(is)`}
            sx={{ height: 22, fontWeight: 600 }}
          />
        </Box>

        {!visible ? (
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Preencha o processo, pacientes e materiais para ver a planilha unificada.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, p: 1.5 }}>
            <Box
              className="excel-sheet-grid"
              sx={{
                width: 'fit-content',
                maxWidth: '100%',
                overflowX: 'auto',
                border: EXCEL_SHEET.border,
                borderRadius: 1,
                bgcolor: EXCEL_SHEET.sheetBg,
                '& .MuiTableCell-root': { verticalAlign: 'middle' },
              }}
            >
              <Table size="small" sx={{ width: 'auto', tableLayout: 'auto' }}>
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={6} sx={groupSx}>
                      DADOS DO PROCESSO
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={labelCellSx}>Nº</TableCell>
                    <TableCell sx={{ ...cellSx, minWidth: 88 }}>{dash(value.numero)}</TableCell>
                    <TableCell sx={labelCellSx}>DATA</TableCell>
                    <TableCell sx={{ ...cellSx, minWidth: 96 }}>{dash(value.data)}</TableCell>
                    <TableCell sx={labelCellSx}>PROCESSO</TableCell>
                    <TableCell sx={{ ...cellSx, minWidth: 120 }}>{dash(value.processo)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={labelCellSx}>PREGÃO/TAD</TableCell>
                    <TableCell sx={{ ...cellSx, minWidth: 88 }}>{dash(value.pregaoTad)}</TableCell>
                    <TableCell sx={labelCellSx}>VIGÊNCIA</TableCell>
                    <TableCell sx={{ ...cellSx, minWidth: 96 }}>{dash(value.vigencia)}</TableCell>
                    <TableCell sx={labelCellSx}>FORNECEDOR</TableCell>
                    <TableCell sx={{ ...cellSx, minWidth: 160 }}>{dash(value.fornecedor)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>

            <Box
              className="excel-sheet-grid"
              sx={{
                width: 'fit-content',
                maxWidth: '100%',
                overflowX: 'auto',
                border: EXCEL_SHEET.border,
                borderRadius: 1,
                bgcolor: EXCEL_SHEET.sheetBg,
                '& .MuiTableCell-root': { verticalAlign: 'middle' },
              }}
            >
              <Table size="small" sx={{ width: 'auto', tableLayout: 'auto' }}>
                <TableHead>
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
                    <TableCell sx={{ ...headerSx, textAlign: 'center', minWidth: 72 }}>
                      AÇÕES
                    </TableCell>
                    <TableCell sx={headerSx}>MAPA DA SALA</TableCell>
                    <TableCell sx={headerSx}>DANFE</TableCell>
                    <TableCell sx={headerSx}>ITEM</TableCell>
                    <TableCell sx={headerSx}>NEB/PI</TableCell>
                    <TableCell sx={headerSx}>DESCRIÇÃO DO MATERIAL</TableCell>
                    <TableCell sx={headerSx}>QT</TableCell>
                    <TableCell sx={headerSx}>VALOR UNIT</TableCell>
                    <TableCell sx={headerSx}>VALOR TOTAL</TableCell>
                    <TableCell sx={{ ...headerSx, textAlign: 'center', minWidth: 72 }}>
                      AÇÕES
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {pacientes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={TOTAL_COLS}
                        sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}
                      >
                        Nenhum paciente adicionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    pacientes.map((paciente, pacIndex) => {
                      const materiais =
                        paciente.materiais.length > 0 ? paciente.materiais : [null]
                      const span = patientRowSpan(paciente)
                      const pacEditing = editingPacienteId === paciente.id

                      return (
                        <Fragment key={paciente.id}>
                          {materiais.map((mat, matIndex) => (
                            <TableRow
                              key={mat?.id ?? `${paciente.id}-empty`}
                              sx={{
                                bgcolor:
                                  pacEditing || (mat && editingMaterialId === mat.id)
                                    ? EXCEL_SHEET.selectedBg
                                    : undefined,
                                '&:hover td': { bgcolor: EXCEL_SHEET.hoverBg },
                              }}
                            >
                              {matIndex === 0 ? (
                                <>
                                  <TableCell
                                    rowSpan={span}
                                    sx={{ ...cellSx, fontWeight: 600, bgcolor: '#fbfcfe' }}
                                  >
                                    {dash(paciente.nip)}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={span}
                                    sx={{ ...cellSx, fontWeight: 600, bgcolor: '#fbfcfe' }}
                                  >
                                    {dash(paciente.iniciais)}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={span}
                                    sx={{ ...cellSx, fontWeight: 600, bgcolor: '#fbfcfe' }}
                                  >
                                    {dash(paciente.data)}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={span}
                                    sx={{
                                      ...cellSx,
                                      fontWeight: 600,
                                      bgcolor: '#fbfcfe',
                                      maxWidth: '28ch',
                                      whiteSpace: 'pre-wrap',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {dash(paciente.procedimento)}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={span}
                                    sx={{
                                      ...cellSx,
                                      textAlign: 'center',
                                      whiteSpace: 'nowrap',
                                      bgcolor: pacEditing ? EXCEL_SHEET.selectedBg : '#fbfcfe',
                                    }}
                                  >
                                    <IconButton
                                      size="small"
                                      aria-label={`Editar paciente ${pacIndex + 1}`}
                                      onClick={() => onEditPaciente?.(paciente.id)}
                                      sx={{ p: 0.35 }}
                                    >
                                      <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      aria-label={`Excluir paciente ${pacIndex + 1}`}
                                      onClick={() => onDeletePaciente?.(paciente.id)}
                                      sx={{ p: 0.35 }}
                                    >
                                      <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </TableCell>
                                </>
                              ) : null}

                              {mat ? (
                                <>
                                  <TableCell sx={cellSx}>{dash(mat.mapaDaSala)}</TableCell>
                                  <TableCell sx={cellSx}>{dash(mat.danfe)}</TableCell>
                                  <TableCell sx={cellSx}>{dash(mat.item)}</TableCell>
                                  <TableCell sx={cellSx}>{dash(mat.nebPi)}</TableCell>
                                  <TableCell
                                    sx={{
                                      ...cellSx,
                                      maxWidth: '110ch',
                                      whiteSpace: 'pre-wrap',
                                      overflowWrap: 'anywhere',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {wrapEveryChars(mat.descricao, 110)}
                                  </TableCell>
                                  <TableCell sx={cellSx}>{dash(mat.qt)}</TableCell>
                                  <TableCell sx={cellSx}>{dash(mat.valorUnit)}</TableCell>
                                  <TableCell sx={{ ...cellSx, fontWeight: 700 }}>
                                    {dash(mat.valorTotal)}
                                  </TableCell>
                                  <TableCell
                                    sx={{ ...cellSx, textAlign: 'center', whiteSpace: 'nowrap' }}
                                  >
                                    <IconButton
                                      size="small"
                                      aria-label={`Editar material ${matIndex + 1}`}
                                      onClick={() => onEditMaterial?.(paciente.id, mat.id)}
                                      sx={{ p: 0.35 }}
                                    >
                                      <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      aria-label={`Excluir material ${matIndex + 1}`}
                                      onClick={() => onDeleteMaterial?.(paciente.id, mat.id)}
                                      sx={{ p: 0.35 }}
                                    >
                                      <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </TableCell>
                                </>
                              ) : (
                                <TableCell
                                  colSpan={MATERIAL_COLS}
                                  sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}
                                >
                                  Sem materiais
                                </TableCell>
                              )}
                            </TableRow>
                          ))}

                          <TableRow>
                            <TableCell
                              colSpan={TOTAL_COLS - 2}
                              sx={{
                                ...cellSx,
                                bgcolor: EXCEL_SHEET.selectHeaderBg,
                                fontWeight: 800,
                                textAlign: 'right',
                              }}
                            >
                              VALOR POR PACIENTE {pacIndex + 1}
                            </TableCell>
                            <TableCell
                              sx={{
                                ...cellSx,
                                bgcolor: '#e8f5e9',
                                fontWeight: 800,
                                color: EXCEL_SHEET.selectedCheck,
                              }}
                            >
                              {dash(paciente.valorPorPaciente)}
                            </TableCell>
                            <TableCell sx={{ ...cellSx, bgcolor: EXCEL_SHEET.selectHeaderBg }} />
                          </TableRow>
                        </Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
