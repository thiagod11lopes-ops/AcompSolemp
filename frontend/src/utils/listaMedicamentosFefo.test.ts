import { describe, expect, it } from 'vitest'
import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import {
  createEmptyListaMedicamentosLinha,
  findListaMedicamentoByNomeELote,
  sortListaMedicamentosFefo,
  suggestListaMedicamentoFefo,
} from '@/utils/listaMedicamentosForm'

function brDate(offsetDays: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function linha(partial: Partial<ListaMedicamentosLinha>): ListaMedicamentosLinha {
  return {
    ...createEmptyListaMedicamentosLinha(),
    medicamento: 'DIPIRONA 500MG',
    ...partial,
  }
}

describe('FEFO — prioridade de lote por validade', () => {
  it('ordena validade mais próxima primeiro e vencidos por último', () => {
    const sorted = sortListaMedicamentosFefo([
      linha({ id: 'vencido', lote: 'V1', validade: brDate(-30), qtd: '10' }),
      linha({ id: 'longe', lote: 'L2', validade: brDate(400), qtd: '10' }),
      linha({ id: 'perto', lote: 'L1', validade: brDate(20), qtd: '10' }),
      linha({ id: 'zerado', lote: 'Z1', validade: brDate(10), qtd: '0' }),
    ])
    expect(sorted.map((l) => l.id)).toEqual(['perto', 'longe', 'vencido', 'zerado'])
  })

  it('sugere o lote FEFO com estoque e validade mais próxima', () => {
    const form: ListaMedicamentosFormData = {
      linhas: [
        linha({ id: 'a', lote: 'A', validade: brDate(400), qtd: '20' }),
        linha({ id: 'b', lote: 'B', validade: brDate(25), qtd: '8' }),
        linha({ id: 'c', lote: 'C', validade: brDate(-10), qtd: '50' }),
      ],
    }
    const sugestao = suggestListaMedicamentoFefo('DIPIRONA 500MG', form)
    expect(sugestao?.id).toBe('b')
  })

  it('sem lote informado, resolve pelo FEFO', () => {
    const form: ListaMedicamentosFormData = {
      linhas: [
        linha({ id: 'x', lote: 'X', validade: brDate(500), qtd: '5' }),
        linha({ id: 'y', lote: 'Y', validade: brDate(40), qtd: '5' }),
      ],
    }
    const found = findListaMedicamentoByNomeELote('DIPIRONA 500MG', '', form)
    expect(found?.id).toBe('y')
  })

  it('respeita lote explícito mesmo que não seja o FEFO', () => {
    const form: ListaMedicamentosFormData = {
      linhas: [
        linha({ id: 'x', lote: 'X', validade: brDate(500), qtd: '5' }),
        linha({ id: 'y', lote: 'Y', validade: brDate(40), qtd: '5' }),
      ],
    }
    const found = findListaMedicamentoByNomeELote('DIPIRONA 500MG', 'X', form)
    expect(found?.id).toBe('x')
  })
})
