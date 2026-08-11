import { useMemo, useState } from 'react'
import { Box, Paper, Typography, alpha } from '@mui/material'
import { ConsumoMaterialManualForm } from '@/components/clinica/ConsumoMaterialManualForm'
import { ConsumoMaterialPlanilhaPreview } from '@/components/clinica/ConsumoMaterialPlanilhaPreview'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { renumerarLinhasConsumo } from '@/utils/consumoMaterialTemplate'

interface ConsumoMaterialConsignadoFormProps {
  value: ConsumoMaterialRow[]
  onChange: (next: ConsumoMaterialRow[]) => void
}

export function ConsumoMaterialConsignadoForm({
  value,
  onChange,
}: ConsumoMaterialConsignadoFormProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  const nextNumero = useMemo(() => {
    if (editingRowId) {
      const current = value.find((r) => r.id === editingRowId)
      if (current?.numero) return current.numero
    }
    return String(value.length + 1)
  }, [editingRowId, value])

  const editingRow = useMemo(
    () => (editingRowId ? value.find((r) => r.id === editingRowId) ?? null : null),
    [editingRowId, value],
  )

  const handleAddOrUpdate = (row: ConsumoMaterialRow) => {
    if (editingRowId) {
      const next = value.map((item) => (item.id === editingRowId ? { ...row, id: editingRowId } : item))
      onChange(renumerarLinhasConsumo(next))
      setEditingRowId(null)
      return
    }
    onChange(renumerarLinhasConsumo([...value, row]))
  }

  const handleEdit = (rowId: string) => {
    setEditingRowId(rowId)
  }

  const handleDelete = (rowId: string) => {
    const next = value.filter((r) => r.id !== rowId)
    onChange(renumerarLinhasConsumo(next))
    if (editingRowId === rowId) setEditingRowId(null)
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(320px, 420px) minmax(0, 1fr)' },
        gap: 2,
        alignItems: 'start',
      }}
    >
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 2,
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          position: { lg: 'sticky' },
          top: { lg: 12 },
          maxHeight: { lg: 'calc(100vh - 120px)' },
          overflow: 'auto',
        })}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          {editingRow ? 'Editando lançamento' : 'Novo lançamento'}
        </Typography>
        <ConsumoMaterialManualForm
          key={editingRow?.id ?? 'new'}
          nextNumero={nextNumero}
          editingRow={editingRow}
          onCancelEdit={() => setEditingRowId(null)}
          onAddRow={handleAddOrUpdate}
          compact
        />
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', fontSize: '0.8rem' }}
        >
          Planilha (ao vivo)
        </Typography>
        <ConsumoMaterialPlanilhaPreview
          rows={value}
          editingRowId={editingRowId}
          onEditRow={handleEdit}
          onDeleteRow={handleDelete}
        />
      </Box>
    </Box>
  )
}
