import { Grid, Card, CardContent, Typography, List, ListItem, ListItemText } from '@mui/material'
import type { DashboardMetrics } from '@/types'
import { formatCurrency } from '@/utils/format'

interface RankingCardsProps {
  metrics: DashboardMetrics
}

function RankingList({
  title,
  items,
  primaryKey,
  secondary,
}: {
  title: string
  items: Record<string, string | number>[]
  primaryKey: string
  secondary: (item: Record<string, string | number>) => string
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <List dense>
          {items.map((item, index) => (
            <ListItem key={index} divider={index < items.length - 1}>
              <ListItemText
                primary={`${index + 1}. ${item[primaryKey]}`}
                secondary={secondary(item)}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}

export function RankingCards({ metrics }: RankingCardsProps) {
  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      <Grid size={{ xs: 12, md: 4 }}>
        <RankingList
          title="Ranking Clínicas"
          items={metrics.rankingClinicas}
          primaryKey="nome"
          secondary={(i) => `${i.total} processos · ${formatCurrency(Number(i.valor))}`}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <RankingList
          title="Ranking Empresas"
          items={metrics.rankingEmpresas}
          primaryKey="nome"
          secondary={(i) => `${i.total} processos · ${formatCurrency(Number(i.valor))}`}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <RankingList
          title="Ranking Responsáveis"
          items={metrics.rankingResponsaveis}
          primaryKey="nome"
          secondary={(i) => `${i.total} em andamento · ${i.atrasados} atrasados`}
        />
      </Grid>
    </Grid>
  )
}
