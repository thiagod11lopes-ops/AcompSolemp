import { formatCurrency } from '@/utils/format'
import {
  downloadAbasAsXlsx,
  downloadTabelaAsPdf,
  type GerarDocumentoAba,
  type GerarDocumentoFormato,
} from '@/utils/gerarDocumentoTabela'
import type { RelatorioGerencial } from '@/utils/relatorioGerencial'

function money(n: number): string {
  return formatCurrency(n)
}

function buildAbas(relatorio: RelatorioGerencial): GerarDocumentoAba[] {
  return [
    {
      name: 'Resumo',
      headers: ['Indicador', 'Valor'],
      rows: [
        ['Gerado em', relatorio.geradoEm],
        ...relatorio.resumo.map((r) => [r.indicador, r.valor]),
      ],
    },
    {
      name: 'Por clínica',
      headers: ['Clínica', 'Origem', 'Total', 'Concluídos', 'Atrasados', 'Valor'],
      rows: relatorio.porClinica.map((r) => [
        r.clinica,
        r.origem,
        String(r.total),
        String(r.concluidos),
        String(r.atrasados),
        money(r.valor),
      ]),
    },
    {
      name: 'OPME vs PME',
      headers: ['Origem', 'Total', 'Concluídos', 'Atrasados', 'Valor processos', 'Valor empenhado'],
      rows: relatorio.porOrigem.map((r) => [
        r.origem,
        String(r.total),
        String(r.concluidos),
        String(r.atrasados),
        money(r.valor),
        money(r.valorEmpenhado),
      ]),
    },
    {
      name: 'Tempo por etapa',
      headers: ['Etapa', 'Qtd.', 'Média dias', 'Atrasados', 'Valor em andamento'],
      rows: relatorio.tempoPorEtapa.map((r) => [
        r.etapa,
        String(r.quantidade),
        String(r.mediaDias),
        String(r.atrasados),
        money(r.valor),
      ]),
    },
    {
      name: 'SOLEMP e NE',
      headers: ['Pedido', 'Clínica', 'Origem', 'SOLEMP', 'NE', 'Valor', 'Data'],
      rows: relatorio.solempNe.map((r) => [
        r.pedido,
        r.clinica,
        r.origem,
        r.solemp,
        r.ne,
        money(r.valor),
        r.data,
      ]),
    },
    {
      name: 'Processos',
      headers: [
        'Pedido',
        'Clínica',
        'Empresa',
        'Origem',
        'Etapa',
        'Status prazo',
        'Concluído',
        'SOLEMP',
        'Valor',
        'Data solicitação',
      ],
      rows: relatorio.processos.map((p) => [
        p.pedidoNumero,
        p.clinicaNome || '—',
        p.empresaNome || '—',
        p.setorTipo === 'medicamento' ? 'PME' : p.setorTipo === 'empenhado' ? 'Empenhado' : 'OPME',
        p.etapasAtivasNomes || p.etapaAtual || '—',
        p.prazoStatus,
        p.concluido ? 'Sim' : 'Não',
        p.solempNumero || '—',
        money(p.valor || 0),
        p.dataSolicitacao?.slice(0, 10) || '—',
      ]),
    },
  ]
}

function buildPdfTabela(relatorio: RelatorioGerencial) {
  const rows: string[][] = [
    ['Gerado em', relatorio.geradoEm],
    ...relatorio.resumo.map((r) => [r.indicador, r.valor]),
    ['', ''],
    ['— Por clínica —', ''],
    ['Clínica / Origem', 'Total · Concl. · Atras. · Valor'],
    ...relatorio.porClinica.map((r) => [
      `${r.clinica} (${r.origem})`,
      `${r.total} · ${r.concluidos} · ${r.atrasados} · ${money(r.valor)}`,
    ]),
    ['', ''],
    ['— OPME vs PME —', ''],
    ['Origem', 'Total · Valor · Empenhado'],
    ...relatorio.porOrigem.map((r) => [
      r.origem,
      `${r.total} · ${money(r.valor)} · ${money(r.valorEmpenhado)}`,
    ]),
    ['', ''],
    ['— Tempo médio por etapa —', ''],
    ['Etapa', 'Qtd · Média dias · Atrasados'],
    ...relatorio.tempoPorEtapa.map((r) => [
      r.etapa,
      `${r.quantidade} · ${r.mediaDias} · ${r.atrasados}`,
    ]),
    ['', ''],
    ['— SOLEMP / NE —', ''],
    ['Pedido', 'SOLEMP · NE · Valor'],
    ...relatorio.solempNe.slice(0, 80).map((r) => [
      `${r.pedido} (${r.clinica})`,
      `${r.solemp} · ${r.ne} · ${money(r.valor)}`,
    ]),
  ]

  return {
    titulo: `Relatório gerencial — ${relatorio.periodoLabel}`,
    fileBaseName: 'Relatorio-Gerencial-AcompOPMS',
    headers: ['Indicador / Dimensão', 'Valor'],
    rows,
  }
}

export async function downloadRelatorioGerencial(
  relatorio: RelatorioGerencial,
  formato: GerarDocumentoFormato,
): Promise<void> {
  if (formato === 'xlsx') {
    await downloadAbasAsXlsx('Relatorio-Gerencial-AcompOPMS', buildAbas(relatorio))
    return
  }
  await downloadTabelaAsPdf(buildPdfTabela(relatorio))
}
