import { describe, expect, it } from 'vitest'
import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import {
  baixarEstoqueListaMedicamentos,
  createEmptyListaMedicamentosLinha,
  devolverEstoqueListaMedicamentos,
  listarHistoricoMovimentacoesListaMedicamentos,
} from '@/utils/listaMedicamentosForm'

function formComLinha(partial: Partial<ListaMedicamentosLinha>): ListaMedicamentosFormData {
  const base = createEmptyListaMedicamentosLinha()
  return {
    linhas: [
      {
        ...base,
        id: 'lista-1',
        medicamento: 'DIPIRONA 500MG',
        lote: 'Lote-A',
        qtd: '20',
        ...partial,
      },
    ],
  }
}

describe('ledger de estoque via IMH', () => {
  it('baixa QTD e registra movimentação com responsável e usuário', () => {
    const form = formComLinha({})
    const next = baixarEstoqueListaMedicamentos(
      form,
      'DIPIRONA 500MG',
      'Lote-A',
      '5',
      'lista-1',
      {
        responsavel: 'Cap. Ana Paula',
        usuarioId: 'u-ana',
        data: '08/11/2026',
        referencia: 'IMH:lin-1 · NIP 12345678',
      },
    )

    expect(next.linhas[0].qtd).toBe('15')
    const movs = next.linhas[0].movimentacoes ?? []
    expect(movs).toHaveLength(1)
    expect(movs[0].tipo).toBe('saida')
    expect(movs[0].qtd).toBe('5')
    expect(movs[0].responsavel).toBe('Cap. Ana Paula')
    expect(movs[0].usuarioId).toBe('u-ana')
    expect(movs[0].origemTipo).toBe('imh_baixa')
    expect(movs[0].origemDestino).toBe('Paciente / IMH PME')
    expect(movs[0].referencia).toContain('IMH:lin-1')
    expect(movs[0].data).toBe('08/11/2026')
  })

  it('devolução (estorno) registra entrada no ledger com o mesmo responsável', () => {
    const form = formComLinha({ qtd: '15' })
    const next = devolverEstoqueListaMedicamentos(
      form,
      'DIPIRONA 500MG',
      'Lote-A',
      '5',
      'lista-1',
      {
        responsavel: 'Ten. Roberto',
        usuarioId: 'u-rob',
        data: '08/11/2026',
      },
    )

    expect(next.linhas[0].qtd).toBe('20')
    const mov = next.linhas[0].movimentacoes?.[0]
    expect(mov?.tipo).toBe('entrada')
    expect(mov?.origemTipo).toBe('imh_devolucao')
    expect(mov?.origemDestino).toBe('Estorno IMH PME')
    expect(mov?.responsavel).toBe('Ten. Roberto')
    expect(mov?.usuarioId).toBe('u-rob')
  })

  it('histórico achatado inclui baixas do IMH para auditoria', () => {
    let form = formComLinha({})
    form = baixarEstoqueListaMedicamentos(form, 'DIPIRONA 500MG', 'Lote-A', '3', 'lista-1', {
      responsavel: 'Medicamento Exemplo',
      usuarioId: 'demo-u',
      data: '01/11/2026',
    })
    const hist = listarHistoricoMovimentacoesListaMedicamentos(form)
    expect(hist).toHaveLength(1)
    expect(hist[0].responsavel).toBe('Medicamento Exemplo')
    expect(hist[0].origemDestino).toBe('Paciente / IMH PME')
    expect(hist[0].tipo).toBe('saida')
  })
})
