import { describe, expect, it } from 'vitest'
import {
  chavesAtivas,
  createFluxoCriticoAppData,
  etapaByChave,
  historicoConcluido,
  pedidoOf,
  usersOf,
} from '@/test/fluxoCriticoFixture'
import {
  advancePedidoEtapa,
  assinarSolempForPedido,
  registrarPagamentoForPedido,
} from '@/utils/workflowAdvance'
import { calcularPrazoStatus } from '@/utils/workflow'
import { syncPrazoEtapaNotifications } from '@/utils/prazoEtapaAlertas'

describe('fluxo crítico OPME', () => {
  it('percorre Auditoria → IMH/Solemp → NE → Empenhado e conclui o PED', () => {
    let data = createFluxoCriticoAppData()
    const users = usersOf(data)
    const pedidoId = 'ped-critico-1'

    // 1) Auditoria encaminha → abre IMH e Confecção em paralelo
    data = advancePedidoEtapa(
      data,
      pedidoId,
      users.auditoria,
      'Planilha conferida e encaminhada.',
      etapaByChave(data, 'DIV_MAT_AUDITORIA').id,
    )

    expect(historicoConcluido(data, 'DIV_MAT_AUDITORIA')).toBe(true)
    expect(chavesAtivas(data, pedidoId).sort()).toEqual(
      ['DIV_MAT_CONTABILIDADE_IMH', 'DIV_MAT_CONFECCAO_SOLEMP'].sort(),
    )
    expect(pedidoOf(data).concluido).toBe(false)

    // 2) IMH conclui → Indenizado automático
    data = advancePedidoEtapa(
      data,
      pedidoId,
      users.imh,
      'Indenização registrada.',
      etapaByChave(data, 'DIV_MAT_CONTABILIDADE_IMH').id,
    )

    expect(historicoConcluido(data, 'DIV_MAT_CONTABILIDADE_IMH')).toBe(true)
    expect(historicoConcluido(data, 'DIV_MAT_INDENIZADO')).toBe(true)
    expect(chavesAtivas(data, pedidoId)).toContain('DIV_MAT_CONFECCAO_SOLEMP')
    expect(pedidoOf(data).concluido).toBe(false)

    // 3) Confecção registra SOLEMP → Aguardando NE
    data = assinarSolempForPedido(data, pedidoId, users.solemp, {
      numero: '65720-2636/2026',
      valor: 15_000,
    })

    expect(data.solemp.some((s) => s.pedidoId === pedidoId && s.assinada)).toBe(true)
    expect(historicoConcluido(data, 'DIV_MAT_CONFECCAO_SOLEMP')).toBe(true)
    expect(chavesAtivas(data, pedidoId)).toContain('DIV_MAT_FINANCAS')
    expect(pedidoOf(data).concluido).toBe(false)

    // 4) Financeiro registra NE/pagamento → Empenhado e PED concluído
    const solemp = data.solemp.find((s) => s.pedidoId === pedidoId)!
    data = registrarPagamentoForPedido(data, pedidoId, solemp.id, users.financeiro, {
      notaFiscalNumero: 'NF-1001',
      empresaNome: 'Empresa Teste',
      empenhoNumero: 'NE-2026-0001',
    })

    expect(historicoConcluido(data, 'DIV_MAT_FINANCAS')).toBe(true)
    expect(historicoConcluido(data, 'DIV_MAT_EMPENHADO')).toBe(true)
    expect(pedidoOf(data).concluido).toBe(true)
    expect(pedidoOf(data).empenhoNumero).toBe('NE-2026-0001')
    expect(data.notasFiscais.some((n) => n.pedidoId === pedidoId)).toBe(true)
    expect(data.auditoria?.some((a) => a.pedidoId === pedidoId)).toBe(true)
  })

  it('rejeita SOLEMP com número inválido', () => {
    let data = createFluxoCriticoAppData()
    const users = usersOf(data)
    const pedidoId = 'ped-critico-1'

    data = advancePedidoEtapa(
      data,
      pedidoId,
      users.auditoria,
      'Encaminhado.',
      etapaByChave(data, 'DIV_MAT_AUDITORIA').id,
    )

    expect(() =>
      assinarSolempForPedido(data, pedidoId, users.solemp, {
        numero: 'SOLEMP-ERRADA',
        valor: 10,
      }),
    ).toThrow(/SOLEMP|número|formato/i)
  })

  it('não avança processo já concluído', () => {
    let data = createFluxoCriticoAppData()
    const users = usersOf(data)
    const pedidoId = 'ped-critico-1'

    data = advancePedidoEtapa(
      data,
      pedidoId,
      users.auditoria,
      'Encaminhado.',
      etapaByChave(data, 'DIV_MAT_AUDITORIA').id,
    )
    data = advancePedidoEtapa(
      data,
      pedidoId,
      users.imh,
      'IMH ok.',
      etapaByChave(data, 'DIV_MAT_CONTABILIDADE_IMH').id,
    )
    data = assinarSolempForPedido(data, pedidoId, users.solemp, {
      numero: '65720-1001/2026',
      valor: 15_000,
    })
    const solemp = data.solemp.find((s) => s.pedidoId === pedidoId)!
    data = registrarPagamentoForPedido(data, pedidoId, solemp.id, users.financeiro, {
      notaFiscalNumero: 'NF-2',
      empresaNome: 'Empresa Teste',
      empenhoNumero: 'NE-2',
    })

    expect(pedidoOf(data).concluido).toBe(true)
    expect(() =>
      advancePedidoEtapa(
        data,
        pedidoId,
        users.financeiro,
        'tentativa inválida',
        etapaByChave(data, 'DIV_MAT_FINANCAS').id,
      ),
    ).toThrow(/encerrado/i)
  })
})

describe('fluxo crítico PME (medicamento)', () => {
  it('encerra ao concluir IMH/Indenizado sem exigir Empenhado', () => {
    let data = createFluxoCriticoAppData({ clinicaTipo: 'medicamento' })
    const users = usersOf(data)
    const pedidoId = 'ped-critico-1'

    data = advancePedidoEtapa(
      data,
      pedidoId,
      users.auditoria,
      'Encaminhado ao IMH.',
      etapaByChave(data, 'DIV_MAT_AUDITORIA').id,
    )

    // No caminho medicamento a Auditoria ainda pode abrir Confecção; IMH basta para fechar.
    data = advancePedidoEtapa(
      data,
      pedidoId,
      users.imh,
      'PME indenizado.',
      etapaByChave(data, 'DIV_MAT_CONTABILIDADE_IMH').id,
    )

    expect(historicoConcluido(data, 'DIV_MAT_INDENIZADO')).toBe(true)
    expect(pedidoOf(data).concluido).toBe(true)
  })
})

describe('regras auxiliares do fluxo crítico', () => {
  it('calcula status de prazo (no prazo / próximo / atrasado)', () => {
    expect(calcularPrazoStatus(0, 3, 2)).toBe('NO_PRAZO')
    expect(calcularPrazoStatus(1, 3, 2)).toBe('PROXIMO_VENCIMENTO')
    expect(calcularPrazoStatus(3, 3, 2)).toBe('PROXIMO_VENCIMENTO')
    expect(calcularPrazoStatus(4, 3, 2)).toBe('ATRASADO')
  })

  it('gera alerta ATRASADO no sininho quando a etapa estourou o prazo', () => {
    const data = createFluxoCriticoAppData()
    const auditoria = etapaByChave(data, 'DIV_MAT_AUDITORIA')
    auditoria.prazoDias = 1
    auditoria.alertaVencimentoDias = 1

    const pedido = pedidoOf(data)
    const hist = pedido.etapasHistorico.find((h) => h.etapaId === auditoria.id)!
    const inicio = new Date()
    inicio.setDate(inicio.getDate() - 5)
    hist.dataInicio = inicio.toISOString()

    const criadas = syncPrazoEtapaNotifications(data)
    expect(criadas).toBeGreaterThan(0)
    expect(
      data.notificacoes.some(
        (n) =>
          n.pedidoId === pedido.id &&
          n.tipo === 'ATRASADO' &&
          n.etapaChave === 'DIV_MAT_AUDITORIA' &&
          !n.lida,
      ),
    ).toBe(true)
  })
})
