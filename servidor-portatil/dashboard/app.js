/* Dashboard AcompOPMS — consome /api/metrics */

const $ = (id) => document.getElementById(id)

let usageChart = null
let refreshTimer = null

function fmtTime(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { hour12: false })
  } catch {
    return iso || '—'
  }
}

function meterClass(pct) {
  if (pct >= 90) return 'is-bad'
  if (pct >= 75) return 'is-warn'
  return ''
}

function renderMeter(container, item) {
  const pct = Number(item.usedPct || 0)
  const el = document.createElement('div')
  el.className = 'meter'
  el.innerHTML = `
    <div class="meter-top">
      <span class="meter-name">${escapeHtml(item.name || item.label || '')}</span>
      <span class="meter-pct">${pct.toFixed(1)}%</span>
    </div>
    <div class="meter-bar"><div class="meter-fill ${meterClass(pct)}" style="width:${Math.min(pct, 100)}%"></div></div>
    <div class="meter-meta">${escapeHtml(item.usedLabel || '')} / ${escapeHtml(item.totalLabel || '')} · livre ${escapeHtml(item.freeLabel || '')}</div>
  `
  container.appendChild(el)
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderPack(container, item) {
  const el = document.createElement('div')
  el.className = 'row'
  el.innerHTML = `
    <div>
      <div class="row-title">${escapeHtml(item.name)}</div>
      <span class="row-sub">${escapeHtml(item.path || '')}</span>
    </div>
    <span class="badge ok">${escapeHtml(item.label)}</span>
  `
  container.appendChild(el)
}

function renderService(container, item) {
  const ok = !!item.ok
  const el = document.createElement('div')
  el.className = 'row'
  el.innerHTML = `
    <div>
      <div class="row-title">${escapeHtml(item.name)}</div>
      <span class="row-sub">${escapeHtml(item.url || '')}</span>
    </div>
    <span class="badge ${ok ? 'ok' : 'bad'}">${escapeHtml(item.label || (ok ? 'Online' : 'Offline'))}</span>
  `
  container.appendChild(el)
}

function renderContainer(container, item) {
  const ok = !!item.ok
  const el = document.createElement('div')
  el.className = 'row'
  el.innerHTML = `
    <div>
      <div class="row-title">${escapeHtml(item.name)}</div>
      <span class="row-sub">${escapeHtml(item.status || '')}</span>
    </div>
    <span class="badge ${ok ? 'ok' : 'warn'}">${ok ? 'Up' : 'Check'}</span>
  `
  container.appendChild(el)
}

function updateUsageChart(usage) {
  const labels = usage?.labels || []
  const values = usage?.values || []
  const ctx = $('chart-usage')
  if (!ctx || typeof Chart === 'undefined') return

  const data = {
    labels,
    datasets: [
      {
        label: 'Acessos',
        data: values,
        fill: true,
        tension: 0.35,
        borderColor: '#7aa892',
        backgroundColor: 'rgba(85, 139, 113, 0.22)',
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  }

  if (usageChart) {
    usageChart.data = data
    usageChart.update('none')
    return
  }

  usageChart = new Chart(ctx, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#10201a',
          titleColor: '#e8f2ec',
          bodyColor: '#8fa89b',
          borderColor: 'rgba(122,168,146,0.3)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#8fa89b',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
            font: { family: 'JetBrains Mono', size: 10 },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#8fa89b',
            precision: 0,
            font: { family: 'JetBrains Mono', size: 10 },
          },
        },
      },
      animation: { duration: 650 },
    },
  })
}

function applyMetrics(m) {
  const servicesOk = (m.services || []).filter((s) => s.ok).length
  const servicesTotal = (m.services || []).length
  const dockerOk = !!m.docker?.running
  const allOk = dockerOk && servicesOk === servicesTotal && servicesTotal > 0

  const pill = $('pill-status')
  pill.textContent = allOk
    ? 'Sistema operacional'
    : dockerOk
      ? `${servicesOk}/${servicesTotal} serviços OK`
      : 'Docker offline'
  pill.className = 'pill ' + (allOk ? 'is-ok' : dockerOk ? 'is-warn' : 'is-bad')

  $('updated-at').textContent = fmtTime(m.generatedAt)
  $('stat-alias').textContent = m.host?.alias || '—'
  $('stat-ip').textContent = m.host?.ip ? `IP ${m.host.ip}` : '—'
  $('stat-cpu').textContent = `${Number(m.cpu?.loadPct || 0).toFixed(0)}%`
  $('stat-mem').textContent = `${Number(m.memory?.usedPct || 0).toFixed(1)}%`
  $('stat-mem-detail').textContent = `${m.memory?.usedLabel || '—'} / ${m.memory?.totalLabel || '—'}`
  $('stat-uptime').textContent = m.uptime?.label || '—'
  $('stat-host').textContent = m.host?.computer || '—'

  const disks = $('disks')
  disks.innerHTML = ''
  ;(m.disks || []).forEach((d) => renderMeter(disks, d))
  if (!(m.disks || []).length) disks.innerHTML = '<p class="panel-desc">Nenhum disco encontrado.</p>'

  const packs = $('packs')
  packs.innerHTML = ''
  ;(m.packSizes || []).forEach((p) => renderPack(packs, p))
  if (!(m.packSizes || []).length) packs.innerHTML = '<p class="panel-desc">Sem pastas configuradas.</p>'

  const services = $('services')
  services.innerHTML = ''
  ;(m.services || []).forEach((s) => renderService(services, s))

  const containers = $('containers')
  containers.innerHTML = ''
  const list = m.docker?.containers || []
  $('docker-summary').textContent = dockerOk
    ? `${list.length} container(s) em execução`
    : 'Docker Desktop não está pronto'
  list.forEach((c) => renderContainer(containers, c))
  if (!list.length) {
    containers.innerHTML = `<p class="panel-desc">${dockerOk ? 'Nenhum container listado.' : 'Inicie o Docker e o Servidor OMPS.'}</p>`
  }

  updateUsageChart(m.usageByHour || {})
  const note = $('usage-note')
  const sum = (m.usageByHour?.values || []).reduce((a, b) => a + Number(b || 0), 0)
  note.textContent =
    sum > 0
      ? `Fonte: ${m.usageByHour?.source || 'logs'} · ${sum} eventos agregados nas últimas janelas.`
      : 'Ainda sem histórico de acessos. Use o sistema normalmente e atualize depois.'
}

async function loadMetrics() {
  const btn = $('btn-refresh')
  btn.disabled = true
  try {
    const res = await fetch('/api/metrics', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    applyMetrics(data)
  } catch (err) {
    $('pill-status').textContent = 'Falha ao ler métricas'
    $('pill-status').className = 'pill is-bad'
    console.error(err)
  } finally {
    btn.disabled = false
  }
}

function boot() {
  $('btn-refresh').addEventListener('click', () => void loadMetrics())
  void loadMetrics()
  refreshTimer = setInterval(() => void loadMetrics(), 20000)
}

document.addEventListener('DOMContentLoaded', boot)
window.addEventListener('beforeunload', () => {
  if (refreshTimer) clearInterval(refreshTimer)
})
