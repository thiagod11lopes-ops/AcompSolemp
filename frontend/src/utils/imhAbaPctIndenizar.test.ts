import { describe, expect, it } from 'vitest'
import {
  calcImhSomasValorEIndenizar,
  createEmptyImhAbaLinha,
  normalizeImhVinculo,
  pctIndenizarFromVinculoETotal,
  withRecalculatedImhLinha,
} from '@/utils/imhAbaForm'

describe('IMH clínica — % a indenizar alinhado ao PME', () => {
  it('normaliza PENSIONISTA e OUTRO', () => {
    expect(normalizeImhVinculo('pensionista')).toBe('PENSIONISTA')
    expect(normalizeImhVinculo('OUTRO')).toBe('OUTROS')
  })

  it('aplica 20% / 100% / manual conforme vínculo', () => {
    expect(pctIndenizarFromVinculoETotal('TITULAR', '100,00')).toBe('20%')
    expect(pctIndenizarFromVinculoETotal('DEPENDENTE DIRETO', '100,00')).toBe('20%')
    expect(pctIndenizarFromVinculoETotal('PENSIONISTA', '100,00')).toBe('20%')
    expect(pctIndenizarFromVinculoETotal('DEPENDENTE INDIRETO', '100,00')).toBe('100%')
    expect(pctIndenizarFromVinculoETotal('OUTROS', '100,00')).toBe('')
  })

  it('grava percentual (não moeda) e soma o valor a indenizar', () => {
    const linha = withRecalculatedImhLinha({
      ...createEmptyImhAbaLinha(),
      vinculo: 'TITULAR',
      valorUnit: '100,00',
      quantidade: '1',
    })
    expect(linha.pctIndenizar).toBe('20%')
    expect(linha.valorTotal.replace(/\s/g, '')).toMatch(/100,00/)

    const somas = calcImhSomasValorEIndenizar([linha])
    expect(somas.valorTotal).toBe(100)
    expect(somas.pctIndenizar).toBe(20)
  })

  it('preserva % manual em OUTROS', () => {
    const linha = withRecalculatedImhLinha({
      ...createEmptyImhAbaLinha(),
      vinculo: 'OUTROS',
      valorUnit: '200,00',
      quantidade: '1',
      pctIndenizar: '30%',
    })
    expect(linha.pctIndenizar).toBe('30%')
    expect(calcImhSomasValorEIndenizar([linha]).pctIndenizar).toBe(60)
  })
})
