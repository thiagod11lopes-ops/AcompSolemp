import { Grid, Card, CardContent, Typography } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardMetrics } from '@/types'
import { formatCurrency } from '@/utils/format'

const COLORS = ['#0B3D91', '#C9A227', '#2E7D32', '#ED6C02', '#D32F2F', '#5B9BD5']

interface DashboardChartsProps {
  metrics: DashboardMetrics
}

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card sx={{ height: 360 }}>
          <CardContent sx={{ height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Processos por mês
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={metrics.processosPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total" stroke="#0B3D91" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="concluidos"
                  name="Concluídos"
                  stroke="#2E7D32"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card sx={{ height: 360 }}>
          <CardContent sx={{ height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Valor por etapa
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={metrics.valorPorEtapa}
                  dataKey="valor"
                  nameKey="etapa"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name }) => String(name).slice(0, 12)}
                >
                  {metrics.valorPorEtapa.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: 320 }}>
          <CardContent sx={{ height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Tempo médio por etapa (dias)
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={metrics.tempoMedioPorEtapa} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="etapa" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="dias" fill="#0B3D91" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: 320 }}>
          <CardContent sx={{ height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Gargalos (média de dias)
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={metrics.rankingGargalos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="etapa" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="mediaDias" name="Média dias" fill="#ED6C02" />
                <Bar dataKey="atrasados" name="Atrasados" fill="#D32F2F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
