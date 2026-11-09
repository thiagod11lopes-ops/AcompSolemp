import { describe, expect, it } from 'vitest'
import type {
  ImhMedicamentoFormData,
  ListaMedicamentosFormData,
  ListaMedicamentosLinha,
} from '@/types'
import { createEmptyImhMedicamentoLinha } from '@/utils/imhMedicamentoForm'
import { createEmptyListaMedicamentosLinha } from '@/utils/listaMedicamentosForm'
import { buildMedicamentoBalanco } from '@/utils/medicamentoBalanco'

function listaComMovs(
  partial: Partial<ListaMedicamentosLinha> & {
    movimentacoes: NonNullable<ListaMedicamentosLinha['movimentacoes']>
  },
): ListaMedicamentosFormData {
  return {
    linhas: [
      {
        ...createEmptyListaMedicamentosLinha(),
        id: 'lista-1',
        medicamento: 'DIPIRONA 500MG',
        lote: 'L1',
        qtd: '50',
        ...partial,
      },
    ],
  }
}

describe('balanço PME alinhado Lista × IMH', () => {
  const referencia = new Date(2026, 10, 8) // 08/11/2026

  it('usa saídas do ledger IMH quando conferem com a planilha', () => {
    const lista = listaComMovs({
      movimentacoes: [
        {
          id: 'm1',
          tipo: 'saida',
          qtd: '10',
          data: '08/11/2026',
          origemDestino: 'Paciente / IMH PME',
          responsavel: 'Ana',
          origemTipo: 'imh_baixa',
          createdAt: '2026-11-08T12:00:00.000Z',
        },
        {
          id: 'm2',
          tipo: 'entrada',
          qtd: '20',
          data: '05/11/2026',
          origemDestino: 'Compra',
          responsavel: 'Ana',
          origemTipo: 'manual',
          createdAt: '2026-11-05T12:00:00.000Z',
        },
      ],
    })
    const imh: ImhMedicamentoFormData = {
      linhas: [
        {
          ...createEmptyImhMedicamentoLinha(),
          data: '08/11/2026',
          itemPme: 'DIPIRONA 500MG',
          qtd: '10',
          total: '100,00',
        },
      ],
    }

    const balanco = buildMedicamentoBalanco({
      listaMedicamentos: lista,
      imhMedicamento: imh,
      pedidos: [],
      periodoTipo: 'mes',
      referencia,
    })

    expect(balanco.estoqueMov.saidasImhLedger).toBe(10)
    expect(balanco.estoqueMov.saidasImhPlanilha).toBe(10)
    expect(balanco.estoqueMov.saidasImhAlinhadas).toBe(10)
    expect(balanco.estoqueMov.entradas).toBe(20)
    expect(balanco.estoqueMov.saidas).toBe(10)
    expect(balanco.estoqueMov.saldoLiquido).toBe(10)
    expect(balanco.estoqueMov.alinhado).toBe(true)
    expect(balanco.estoqueMov.divergenciaImh).toBe(0)
  })

  it('não subconta consumo IMH antigo sem movimentação no ledger', () => {
    const lista = listaComMovs({
      qtd: '40',
      movimentacoes: [
        {
          id: 'm1',
          tipo: 'saida',
          qtd: '2',
          data: '08/11/2026',
          origemDestino: 'Ajuste',
          responsavel: 'Ana',
          origemTipo: 'manual',
          createdAt: '2026-11-08T12:00:00.000Z',
        },
      ],
    })
    const imh: ImhMedicamentoFormData = {
      linhas: [
        {
          ...createEmptyImhMedicamentoLinha(),
          data: '08/11/2026',
          itemPme: 'DIPIRONA 500MG',
          qtd: '15',
        },
      ],
    }

    const balanco = buildMedicamentoBalanco({
      listaMedicamentos: lista,
      imhMedicamento: imh,
      pedidos: [],
      periodoTipo: 'mes',
      referencia,
    })

    expect(balanco.estoqueMov.saidasImhLedger).toBe(0)
    expect(balanco.estoqueMov.saidasImhPlanilha).toBe(15)
    expect(balanco.estoqueMov.saidasImhAlinhadas).toBe(15)
    expect(balanco.estoqueMov.saidasManuais).toBe(2)
    expect(balanco.estoqueMov.saidas).toBe(17)
    expect(balanco.estoqueMov.alinhado).toBe(false)
    expect(balanco.estoqueMov.divergenciaImh).toBe(15)
  })
})
