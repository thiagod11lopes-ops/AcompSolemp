import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useClinicaPedidos } from '@/hooks/useClinicaPedidos'
import { clinicaPlanilhasLivresService } from '@/services/clinicaPlanilhasLivresService'
import {
  DEMO_MEDICAMENTO_EXEMPLO_ID,
  persistDemoMedicamentoDashboardExemplo,
} from '@/services/demoCadastrosService'
import { EMPTY_IMH_MEDICAMENTO_FORM } from '@/utils/imhMedicamentoForm'
import { EMPTY_LISTA_MEDICAMENTOS_FORM } from '@/utils/listaMedicamentosForm'
import {
  buildMedicamentoBalanco,
  buildMedicamentoPmeChartData,
  createMedicamentoBalancoExemploInput,
  type BalancoPeriodoTipo,
  type MedicamentoBalancoInput,
} from '@/utils/medicamentoBalanco'

export function useMedicamentoPmeResumo(clinicaId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  const { data: pedidos = [] } = useClinicaPedidos()
  const [periodoTipo, setPeriodoTipo] = useState<BalancoPeriodoTipo>('mes')
  const [referencia, setReferencia] = useState(() => new Date())
  const [mostrarExemplo, setMostrarExemplo] = useState(false)

  const anos = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => y - i)
  }, [])

  useEffect(() => {
    if (!enabled || clinicaId !== DEMO_MEDICAMENTO_EXEMPLO_ID) return
    let cancelado = false
    void persistDemoMedicamentoDashboardExemplo().then((gravou) => {
      if (!gravou || cancelado) return
      void queryClient.invalidateQueries({ queryKey: ['clinica-balanco-planilhas', clinicaId] })
      void queryClient.invalidateQueries({ queryKey: ['clinica-pedidos', clinicaId] })
    })
    return () => {
      cancelado = true
    }
  }, [clinicaId, enabled, queryClient])

  const { data: planilhas, isError: planilhasError } = useQuery({
    queryKey: ['clinica-balanco-planilhas', clinicaId],
    queryFn: () => clinicaPlanilhasLivresService.getState(clinicaId, 'medicamento'),
    enabled: Boolean(clinicaId) && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })

  const input = useMemo<MedicamentoBalancoInput>(() => {
    if (mostrarExemplo) return createMedicamentoBalancoExemploInput(periodoTipo, referencia)
    return {
      listaMedicamentos: planilhas?.listaMedicamentos ?? EMPTY_LISTA_MEDICAMENTOS_FORM,
      imhMedicamento: planilhas?.imhMedicamento ?? EMPTY_IMH_MEDICAMENTO_FORM,
      pedidos: Array.isArray(pedidos) ? pedidos : [],
      periodoTipo,
      referencia,
    }
  }, [mostrarExemplo, periodoTipo, referencia, planilhas, pedidos])

  const balanco = useMemo(() => {
    try {
      return buildMedicamentoBalanco(input)
    } catch (err) {
      console.error('Falha ao montar resumo PME:', err)
      return buildMedicamentoBalanco({
        listaMedicamentos: EMPTY_LISTA_MEDICAMENTOS_FORM,
        imhMedicamento: EMPTY_IMH_MEDICAMENTO_FORM,
        pedidos: [],
        periodoTipo,
        referencia,
      })
    }
  }, [input, periodoTipo, referencia])

  const charts = useMemo(() => buildMedicamentoPmeChartData(input), [input])

  const pacientesPme = mostrarExemplo ? 186 : (planilhas?.pacientesPme?.length ?? 0)
  const planilhasEmCorrecao = mostrarExemplo
    ? 8
    : pedidos.filter((pedido) => pedido.planilhaDevolvidaParaChave === 'SOLICITACAO').length

  return {
    periodoTipo,
    setPeriodoTipo,
    referencia,
    setReferencia,
    mostrarExemplo,
    setMostrarExemplo,
    anos,
    planilhasError,
    balanco,
    charts,
    pacientesPme,
    planilhasEmCorrecao,
  }
}
