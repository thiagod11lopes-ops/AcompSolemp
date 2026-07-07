import { useMemo, useState } from 'react'
import { Box, Paper, Tab, Tabs, Typography, Alert } from '@mui/material'
import ArchiveIcon from '@mui/icons-material/Archive'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProcessosArquivadosTable } from '@/components/workflow/ProcessosArquivadosTable'
import { useProcessosArquivadosGestor } from '@/hooks/useProcessosArquivados'

export default function GestorArquivadosPage() {
  const { data: processos = [], isLoading } = useProcessosArquivadosGestor()
  const [aba, setAba] = useState(0)

  const setores = useMemo(() => {
    const mapa = new Map<string, typeof processos>()
    for (const processo of processos) {
      const lista = mapa.get(processo.etapaNome) ?? []
      lista.push(processo)
      mapa.set(processo.etapaNome, lista)
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [processos])

  const abaAtual = aba === 0 ? null : setores[aba - 1]?.[0] ?? null
  const filtrados =
    aba === 0 ? processos : processos.filter((p) => p.etapaNome === abaAtual)

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Arquivados"
        subtitle="Todos os processos arquivados por setor em todo o sistema"
      />

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Tabs
          value={aba}
          onChange={(_, value) => setAba(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          <Tab label={`Todos (${processos.length})`} />
          {setores.map(([nome, itens], index) => (
            <Tab key={nome} label={`${nome} (${itens.length})`} value={index + 1} />
          ))}
        </Tabs>

        {filtrados.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ArchiveIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              Nenhum processo arquivado ainda.
            </Typography>
          </Box>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Cada setor arquiva automaticamente ao concluir sua etapa ou encaminhar o documento.
            </Alert>
            <ProcessosArquivadosTable
              processos={filtrados}
              showSetor={aba === 0}
              emptyMessage="Nenhum processo arquivado."
            />
          </>
        )}
      </Paper>
    </>
  )
}
