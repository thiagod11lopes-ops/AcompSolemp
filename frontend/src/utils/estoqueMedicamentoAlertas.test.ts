import { describe, expect, it } from 'vitest'
import type { AppData, ListaMedicamentosLinha } from '@/types'
import { createEmptyListaMedicamentosLinha } from '@/utils/listaMedicamentosForm'
import {
  filtrarNotificacoesEstoquePorClinica,
  syncEstoqueMedicamentoNotifications,
} from '@/utils/estoqueMedicamentoAlertas'

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
    lote: 'L1',
    ...partial,
  }
}

function appComClinica(clinicaId: string): AppData {
  return {
    clinicas: [
      {
        id: clinicaId,
        nome: 'Farmácia Teste',
        responsavel: 'Resp',
        telefone: '',
        tipo: 'medicamento',
      },
    ],
    empresas: [],
    materiais: [],
    usuarios: [],
    pedidos: [],
    historico: [],
    notificacoes: [],
    reversoes: [],
    workflowEtapas: [],
    planilhasLivres: {
      [clinicaId]: {
        abas: [],
        abaAtivaId: null,
        listaMedicamentos: {
          linhas: [
            linha({
              id: 'lin-baixo',
              qtd: '5',
              estoqueBaixo: '10',
              validade: brDate(200),
            }),
            linha({
              id: 'lin-venc',
              lote: 'L2',
              qtd: '20',
              estoqueBaixo: '5',
              validade: brDate(-5),
            }),
          ],
        },
      },
    },
  } as AppData
}

describe('alertas de estoque no sininho', () => {
  it('cria notificações de estoque baixo e validade vencida', () => {
    const data = appComClinica('cli-med-1')
    const mutacoes = syncEstoqueMedicamentoNotifications(data)
    expect(mutacoes).toBeGreaterThan(0)

    const tipos = data.notificacoes.map((n) => n.tipo).sort()
    expect(tipos).toContain('ESTOQUE_BAIXO')
    expect(tipos).toContain('VALIDADE_VENCIDA')
    expect(data.notificacoes.every((n) => n.perfilDestino === 'MEDICAMENTO')).toBe(true)
    expect(data.notificacoes.every((n) => n.etapaChave === 'cli-med-1')).toBe(true)
  })

  it('marca como lida quando a condição deixa de existir', () => {
    const data = appComClinica('cli-med-1')
    syncEstoqueMedicamentoNotifications(data)
    expect(data.notificacoes.some((n) => !n.lida && n.tipo === 'ESTOQUE_BAIXO')).toBe(true)

    const state = data.planilhasLivres!['cli-med-1']!
    state.listaMedicamentos = {
      linhas: [
        linha({
          id: 'lin-baixo',
          qtd: '50',
          estoqueBaixo: '10',
          validade: brDate(200),
        }),
      ],
    }
    syncEstoqueMedicamentoNotifications(data)
    const baixo = data.notificacoes.find((n) => n.tipo === 'ESTOQUE_BAIXO')
    expect(baixo?.lida).toBe(true)
  })

  it('filtra alertas pela clínica logada', () => {
    const notifs = [
      {
        id: 'a',
        tipo: 'ESTOQUE_BAIXO' as const,
        titulo: 't',
        mensagem: 'm',
        pedidoId: null,
        reversaoId: null,
        perfilDestino: 'MEDICAMENTO' as const,
        etapaChave: 'cli-a',
        lida: false,
        data: new Date().toISOString(),
      },
      {
        id: 'b',
        tipo: 'ESTOQUE_BAIXO' as const,
        titulo: 't',
        mensagem: 'm',
        pedidoId: null,
        reversaoId: null,
        perfilDestino: 'MEDICAMENTO' as const,
        etapaChave: 'cli-b',
        lida: false,
        data: new Date().toISOString(),
      },
      {
        id: 'c',
        tipo: 'ETAPA_PENDENTE' as const,
        titulo: 't',
        mensagem: 'm',
        pedidoId: 'p1',
        reversaoId: null,
        perfilDestino: 'MEDICAMENTO' as const,
        etapaChave: null,
        lida: false,
        data: new Date().toISOString(),
      },
    ]
    const filtrados = filtrarNotificacoesEstoquePorClinica(notifs, 'cli-a')
    expect(filtrados.map((n) => n.id)).toEqual(['a', 'c'])
  })
})
