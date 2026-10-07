import { formatCurrency } from '@/utils/format'
import {
  buildMedicamentoBalancoChartBundles,
  formatBalancoQtd,
  type MedicamentoBalancoResult,
  type MedicamentoPmeChartData,
} from '@/utils/medicamentoBalanco'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function barRow(label: string, value: number, max: number, color: string, fmt: (n: number) => string) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="bar-val">${escapeHtml(fmt(value))}</div>
    </div>`
}

function buildMedicamentoBalancoPdfMarkup(
  balanco: MedicamentoBalancoResult,
  charts: MedicamentoPmeChartData,
  clinicaNome: string,
  geradoEm: string,
): string {
  const bundles = buildMedicamentoBalancoChartBundles(balanco)

  const formatKpi = (value: number, format: 'qtd' | 'moeda' | 'int') => {
    if (format === 'moeda') return formatCurrency(value)
    if (format === 'qtd') return formatBalancoQtd(value)
    return String(value)
  }

  const kpiCards = bundles.kpis
    .map(
      (k) => `
      <div class="kpi">
        <div class="kpi-label">${escapeHtml(k.label)}</div>
        <div class="kpi-value">${escapeHtml(formatKpi(k.value, k.format))}</div>
      </div>`,
    )
    .join('')

  const maxTop = Math.max(...charts.topMedicamentos.map((m) => m.valor), 1)
  const topBars = charts.topMedicamentos.length
    ? charts.topMedicamentos
        .map((m) => barRow(m.nome, m.valor, maxTop, '#558B71', formatCurrency))
        .join('')
    : '<p class="empty">Sem consumo de medicamentos no período.</p>'

  const maxEvo = Math.max(...charts.evolucao.map((e) => Math.max(e.consumo, e.indenizar)), 1)
  const evoBars = charts.evolucao.length
    ? charts.evolucao
        .map((e) => barRow(e.ponto, e.consumo, maxEvo, '#7AA892', formatCurrency))
        .join('')
    : '<p class="empty">Sem evolução no período.</p>'

  const maxFluxo = Math.max(...charts.fluxoEstoque.map((f) => f.valor), 1)
  const fluxoBars = charts.fluxoEstoque.length
    ? charts.fluxoEstoque
        .map((f) =>
          barRow(
            f.nome,
            f.valor,
            maxFluxo,
            f.nome.toLowerCase().includes('sa') ? '#F97316' : '#22C55E',
            formatBalancoQtd,
          ),
        )
        .join('')
    : '<p class="empty">Sem movimentação de estoque.</p>'

  const alertaChips =
    bundles.alertas[0]?.nome === 'Sem alertas'
      ? '<span class="chip ok"><i></i>Sem alertas de estoque/validade</span>'
      : bundles.alertas
          .map(
            (a) =>
              `<span class="chip" style="border-color:${a.fill};color:${a.fill}"><i style="background:${a.fill}"></i>${escapeHtml(a.nome)}: ${a.valor}</span>`,
          )
          .join('')

  const pedidoChips = bundles.pedidos
    .map(
      (p) =>
        `<span class="chip" style="border-color:${p.fill};color:${p.fill}"><i style="background:${p.fill}"></i>${escapeHtml(p.nome)}: ${p.valor}</span>`,
    )
    .join('')

  return `
<div id="medicamentoBalancoPdfPage" class="page">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .page {
      width: 1120px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0F172A;
      background: #F4F7F5;
      padding: 0 0 28px;
    }
    .hero {
      background: linear-gradient(135deg, #3F6B56 0%, #558B71 48%, #7AA892 100%);
      color: #fff;
      padding: 36px 40px 32px;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: "";
      position: absolute;
      left: -60px; bottom: -90px;
      width: 240px; height: 240px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%);
    }
    .hero::after {
      content: "";
      position: absolute;
      right: -80px; top: -80px;
      width: 280px; height: 280px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%);
    }
    .hero-brand {
      font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase;
      color: rgba(255,255,255,0.7); font-weight: 600; margin-bottom: 10px;
    }
    .hero h1 {
      font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px;
    }
    .hero-periodo {
      font-size: 15px; color: rgba(255,255,255,0.9); margin-bottom: 18px;
    }
    .hero-meta {
      display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: rgba(255,255,255,0.6);
    }
    .body { padding: 28px 40px 0; }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px;
    }
    .kpi {
      background: #fff; border-radius: 14px; padding: 14px 16px;
      border: 1px solid rgba(63,107,86,0.12);
      box-shadow: 0 8px 24px rgba(15,23,42,0.05);
    }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; font-weight: 700; }
    .kpi-value { font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 6px; letter-spacing: -0.02em; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px;
      border: 1.5px solid; background: #fff;
    }
    .chip.ok { border-color: #94A3B8; color: #64748B; }
    .chip.ok i { background: #94A3B8; }
    .chip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .sections { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card {
      background: #fff; border-radius: 16px; padding: 20px 22px;
      border: 1px solid rgba(63,107,86,0.1);
      box-shadow: 0 8px 24px rgba(15,23,42,0.05);
    }
    .card.full { grid-column: 1 / -1; }
    .card h2 {
      font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 14px;
      letter-spacing: -0.01em;
    }
    .bar-row { display: grid; grid-template-columns: 140px 1fr 96px; gap: 10px; align-items: center; margin-bottom: 8px; }
    .bar-label { font-size: 11px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { height: 10px; background: #E2E8F0; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; }
    .bar-val { font-size: 11px; font-weight: 700; color: #334155; text-align: right; }
    .empty { font-size: 13px; color: #94A3B8; padding: 8px 0; }
    .footer {
      margin-top: 28px; padding-top: 16px; border-top: 1px solid rgba(15,23,42,0.08);
      display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8;
    }
  </style>
  <div class="hero">
    <div class="hero-brand">AcompOPMS · PME</div>
    <h1>Balanço Geral de Medicamento</h1>
    <div class="hero-periodo">${escapeHtml(clinicaNome)} · ${escapeHtml(balanco.periodoLabel)}</div>
    <div class="hero-meta">
      <span>Documento gerado em ${escapeHtml(geradoEm)}</span>
      <span>·</span>
      <span>Portal da Clínica · Medicamento</span>
    </div>
  </div>
  <div class="body">
    <div class="kpi-grid">${kpiCards}</div>
    <div class="chips">${pedidoChips}${alertaChips}</div>
    <div class="sections">
      <div class="card">
        <h2>Evolução do consumo</h2>
        ${evoBars}
      </div>
      <div class="card">
        <h2>Itens mais consumidos</h2>
        ${topBars}
      </div>
      <div class="card full">
        <h2>Movimento de estoque</h2>
        ${fluxoBars}
      </div>
    </div>
    <div class="footer">
      <span>AcompOPMS — Balanço PME</span>
      <span>Confidencial · uso interno</span>
    </div>
  </div>
</div>`
}

/** Gera PDF A4 paisagem do balanço PME (html2canvas + jsPDF). */
export async function downloadMedicamentoBalancoPdf(input: {
  balanco: MedicamentoBalancoResult
  charts: MedicamentoPmeChartData
  clinicaNome: string
}): Promise<void> {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  const html2canvas = html2canvasModule.default

  const geradoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const host = document.createElement('div')
  host.setAttribute('data-acomp-med-balanco-pdf', '1')
  host.style.cssText =
    'position:fixed;left:-16000px;top:0;opacity:1;pointer-events:none;z-index:-1;'
  document.body.appendChild(host)
  host.innerHTML = buildMedicamentoBalancoPdfMarkup(
    input.balanco,
    input.charts,
    input.clinicaNome,
    geradoEm,
  )

  const waitFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  try {
    await waitFrame()
    await waitFrame()

    const pageEl = host.querySelector('#medicamentoBalancoPdfPage') as HTMLElement | null
    if (!pageEl) throw new Error('Falha ao montar o documento de balanço PME.')

    const canvas = await html2canvas(pageEl, {
      backgroundColor: '#F4F7F5',
      scale: 2,
      useCORS: true,
      logging: false,
      width: 1120,
      windowWidth: 1120,
    })

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pageWidthMm = 297
    const pageHeightMm = 210
    const marginMm = 6
    const usableWidthMm = pageWidthMm - marginMm * 2
    const usableHeightMm = pageHeightMm - marginMm * 2

    const imgWidthMm = usableWidthMm
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width

    if (imgHeightMm <= usableHeightMm) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', marginMm, marginMm, imgWidthMm, imgHeightMm)
    } else {
      const pxPerMm = canvas.width / imgWidthMm
      const sliceHeightPx = Math.floor(usableHeightMm * pxPerMm)
      let offsetY = 0
      let page = 0
      while (offsetY < canvas.height) {
        const sliceH = Math.min(sliceHeightPx, canvas.height - offsetY)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = sliceH
        const ctx = sliceCanvas.getContext('2d')
        if (!ctx) break
        ctx.fillStyle = '#F4F7F5'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const sliceHeightMm = sliceH / pxPerMm
        if (page > 0) pdf.addPage()
        pdf.addImage(
          sliceCanvas.toDataURL('image/png'),
          'PNG',
          marginMm,
          marginMm,
          imgWidthMm,
          sliceHeightMm,
        )
        offsetY += sliceH
        page += 1
      }
    }

    const stamp = new Date().toISOString().slice(0, 10)
    pdf.save(`balanco-medicamento-${stamp}.pdf`)
  } finally {
    host.remove()
  }
}
