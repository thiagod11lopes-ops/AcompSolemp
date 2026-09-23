import type { GestorBalancoResult } from '@/utils/gestorBalanco'
import { formatCurrency } from '@/utils/format'

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

function buildBalancoPdfMarkup(balanco: GestorBalancoResult, geradoEm: string): string {
  const { kpis } = balanco
  const maxEmpenho = Math.max(...balanco.empenhoPorMes.map((m) => m.valor), 1)
  const maxClinica = Math.max(...balanco.rankingClinicas.map((c) => c.valor), 1)
  const maxGargalo = Math.max(...balanco.gargalos.map((g) => g.quantidade), 1)
  const maxSerie = Math.max(...balanco.serieMensal.map((s) => s.processos), 1)

  const kpiCards = [
    { label: 'Processos', value: String(kpis.totalProcessos), sub: `${kpis.emAndamento} em andamento` },
    { label: 'Concluídos', value: String(kpis.concluidos), sub: kpis.tempoMedioConclusaoDias != null ? `média ${kpis.tempoMedioConclusaoDias} dias` : '—' },
    { label: 'Atrasados', value: String(kpis.atrasados), sub: `${kpis.proximosVencimento} próximos` },
    { label: 'Empenhado', value: formatCurrency(kpis.valorEmpenhado), sub: `${kpis.quantidadeEmpenhado} empenhos` },
    { label: 'Indenizado', value: formatCurrency(kpis.valorIndenizado), sub: `a indenizar ${formatCurrency(kpis.valorASerIndenizado)}` },
    { label: 'Aguardando empenho', value: formatCurrency(kpis.valorAguardandoEmpenho), sub: `${kpis.quantidadeAguardandoEmpenho} SOLEMP` },
  ]
    .map(
      (k) => `
      <div class="kpi">
        <div class="kpi-label">${escapeHtml(k.label)}</div>
        <div class="kpi-value">${escapeHtml(k.value)}</div>
        <div class="kpi-sub">${escapeHtml(k.sub)}</div>
      </div>`,
    )
    .join('')

  const statusChips = balanco.statusDistribuicao
    .map(
      (s) =>
        `<span class="chip" style="border-color:${s.color};color:${s.color}"><i style="background:${s.color}"></i>${escapeHtml(s.name)}: ${s.value}</span>`,
    )
    .join('')

  const empenhoBars = balanco.empenhoPorMes.length
    ? balanco.empenhoPorMes
        .map((m) => barRow(m.mesLabel, m.valor, maxEmpenho, '#60A5FA', formatCurrency))
        .join('')
    : '<p class="empty">Sem empenhos no período.</p>'

  const clinicaBars = balanco.rankingClinicas.length
    ? balanco.rankingClinicas
        .map((c) => barRow(c.nome, c.valor, maxClinica, '#34D399', formatCurrency))
        .join('')
    : '<p class="empty">Sem dados de clínicas.</p>'

  const gargaloBars = balanco.gargalos.length
    ? balanco.gargalos
        .map((g) => barRow(g.etapa, g.quantidade, maxGargalo, '#FBBF24', (n) => `${n}`))
        .join('')
    : '<p class="empty">Sem gargalos no período.</p>'

  const serieBars = balanco.serieMensal.length
    ? balanco.serieMensal
        .map((s) => barRow(s.mesLabel, s.processos, maxSerie, '#A78BFA', (n) => `${n} proc.`))
        .join('')
    : '<p class="empty">Sem processos no período.</p>'

  return `
<div id="gestorBalancoPdfPage" class="page">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .page {
      width: 1120px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0F172A;
      background: #F8FAFC;
      padding: 0 0 28px;
    }
    .hero {
      background: linear-gradient(135deg, #0B1220 0%, #1E3A5F 45%, #1D4ED8 100%);
      color: #fff;
      padding: 36px 40px 32px;
      position: relative;
      overflow: hidden;
    }
    .hero::after {
      content: "";
      position: absolute;
      right: -80px; top: -80px;
      width: 280px; height: 280px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(96,165,250,0.35), transparent 70%);
    }
    .hero-brand {
      font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase;
      color: rgba(255,255,255,0.65); font-weight: 600; margin-bottom: 10px;
    }
    .hero h1 {
      font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px;
    }
    .hero-periodo {
      font-size: 15px; color: rgba(255,255,255,0.85); margin-bottom: 18px;
    }
    .hero-meta {
      display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: rgba(255,255,255,0.55);
    }
    .body { padding: 28px 40px 0; }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px;
    }
    .kpi {
      background: #fff; border-radius: 14px; padding: 16px 18px;
      border: 1px solid rgba(15,23,42,0.06);
      box-shadow: 0 4px 18px rgba(15,23,42,0.04);
    }
    .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; font-weight: 600; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #0F172A; margin: 6px 0 4px; letter-spacing: -0.02em; }
    .kpi-sub { font-size: 12px; color: #94A3B8; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px;
      border: 1.5px solid; background: #fff;
    }
    .chip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .sections { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card {
      background: #fff; border-radius: 16px; padding: 20px 22px;
      border: 1px solid rgba(15,23,42,0.06);
      box-shadow: 0 4px 18px rgba(15,23,42,0.04);
    }
    .card.full { grid-column: 1 / -1; }
    .card h2 {
      font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 14px;
      letter-spacing: -0.01em;
    }
    .bar-row { display: grid; grid-template-columns: 120px 1fr 90px; gap: 10px; align-items: center; margin-bottom: 8px; }
    .bar-label { font-size: 11px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { height: 10px; background: #E2E8F0; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; }
    .bar-val { font-size: 11px; font-weight: 600; color: #334155; text-align: right; }
    .empty { font-size: 13px; color: #94A3B8; padding: 8px 0; }
    .footer {
      margin-top: 28px; padding-top: 16px; border-top: 1px solid rgba(15,23,42,0.08);
      display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8;
    }
  </style>
  <div class="hero">
    <div class="hero-brand">AcompSOLEMP · Marinha do Brasil</div>
    <h1>Balanço Geral do Sistema</h1>
    <div class="hero-periodo">${escapeHtml(balanco.periodoLabel)}</div>
    <div class="hero-meta">
      <span>Documento gerado em ${escapeHtml(geradoEm)}</span>
      <span>·</span>
      <span>Portal do Gestor</span>
    </div>
  </div>
  <div class="body">
    <div class="kpi-grid">${kpiCards}</div>
    <div class="chips">${statusChips || '<span class="empty">Sem distribuição de status.</span>'}</div>
    <div class="sections">
      <div class="card">
        <h2>Empenhos por mês</h2>
        ${empenhoBars}
      </div>
      <div class="card">
        <h2>Processos por mês</h2>
        ${serieBars}
      </div>
      <div class="card">
        <h2>Ranking de clínicas (valor)</h2>
        ${clinicaBars}
      </div>
      <div class="card">
        <h2>Gargalos — PEDs em andamento</h2>
        ${gargaloBars}
      </div>
    </div>
    <div class="footer">
      <span>AcompSOLEMP — Balanço consolidado</span>
      <span>Confidencial · uso interno</span>
    </div>
  </div>
</div>`
}

/**
 * Gera PDF A4 paisagem ultra-moderno do balanço do gestor (html2canvas + jsPDF).
 */
export async function downloadGestorBalancoPdf(balanco: GestorBalancoResult): Promise<void> {
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
  host.setAttribute('data-acomp-balanco-pdf', '1')
  host.style.cssText =
    'position:fixed;left:-16000px;top:0;opacity:1;pointer-events:none;z-index:-1;'
  document.body.appendChild(host)
  host.innerHTML = buildBalancoPdfMarkup(balanco, geradoEm)

  const waitFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  try {
    await waitFrame()
    await waitFrame()

    const pageEl = host.querySelector('#gestorBalancoPdfPage') as HTMLElement | null
    if (!pageEl) throw new Error('Falha ao montar o documento de balanço.')

    const canvas = await html2canvas(pageEl, {
      backgroundColor: '#F8FAFC',
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
      // Multipágina: fatia o canvas verticalmente
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
        ctx.fillStyle = '#F8FAFC'
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
    pdf.save(`balanco-gestor-${stamp}.pdf`)
  } finally {
    host.remove()
  }
}
