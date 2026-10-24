/* Dashboard AcompOPMS — consome /api/metrics */

const $ = (id) => document.getElementById(id)

let usageChart = null
let diskChart = null
let refreshTimer = null
let diskList = []
let selectedDiskIndex = 0
let diskInitialized = false

const DISK_COLORS = {
  used: '#558B71',
  usedBright: '#7AA892',
  free: '#2A3F36',
  freeBright: '#4A6B5C',
}

function fmtTime(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { hour12: false })
  } catch {
    return iso || '—'
  }
}

/** Reduz a fonte do endereço ate caber inteiro em uma linha no card. */
function fitAddressFont(el) {
  if (!el) return
  const card = el.closest('.stat') || el.parentElement
  if (!card) return

  const cs = getComputedStyle(card)
  const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
  const available = Math.max(40, card.clientWidth - padX)

  el.style.whiteSpace = 'nowrap'
  el.style.overflow = 'visible'
  el.style.display = 'inline-block'
  el.style.width = 'auto'
  el.style.maxWidth = 'none'
  el.style.transform = 'none'

  let lo = 9
  let hi = 26
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    el.style.fontSize = `${mid}px`
    if (el.scrollWidth <= available) lo = mid
    else hi = mid
  }

  // Folga minima para nao encostar na borda
  let size = lo
  el.style.fontSize = `${size}px`
  while (el.scrollWidth > available && size > 8) {
    size -= 0.25
    el.style.fontSize = `${size}px`
  }

  el.style.display = 'block'
  el.style.width = '100%'
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderDiskLegend(disk) {
  const legend = $('disk-legend')
  if (!legend || !disk) {
    if (legend) legend.innerHTML = ''
    return
  }
  const pct = Number(disk.usedPct || 0)
  legend.innerHTML = `
    <div class="disk-legend-item">
      <span class="disk-swatch" style="background:${DISK_COLORS.usedBright};color:${DISK_COLORS.usedBright}"></span>
      <div class="disk-legend-text">
        <div class="disk-legend-title">Em uso · ${pct.toFixed(1)}%</div>
        <div class="disk-legend-meta">${escapeHtml(disk.usedLabel || '')} de ${escapeHtml(disk.totalLabel || '')}</div>
      </div>
    </div>
    <div class="disk-legend-item">
      <span class="disk-swatch" style="background:${DISK_COLORS.freeBright};color:${DISK_COLORS.freeBright}"></span>
      <div class="disk-legend-text">
        <div class="disk-legend-title">Livre · ${(100 - pct).toFixed(1)}%</div>
        <div class="disk-legend-meta">${escapeHtml(disk.freeLabel || '')} disponíveis</div>
      </div>
    </div>
  `
}

function renderDiskTabs() {
  const tabs = $('disk-tabs')
  if (!tabs) return
  if (diskList.length <= 1) {
    tabs.hidden = true
    tabs.innerHTML = ''
    return
  }
  tabs.hidden = false
  tabs.innerHTML = ''
  diskList.forEach((disk, idx) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'disk-tab' + (idx === selectedDiskIndex ? ' is-active' : '')
    btn.textContent = disk.name || disk.label || `Disco ${idx + 1}`
    btn.addEventListener('click', () => {
      selectedDiskIndex = idx
      renderDiskTabs()
      updateDiskPie(diskList[selectedDiskIndex])
    })
    tabs.appendChild(btn)
  })
}

function updateDiskPie(disk) {
  const el = $('chart-disk')
  if (!el) return
  if (!disk) {
    el.innerHTML = '<p class="panel-desc" style="padding:2rem;text-align:center">Nenhum disco encontrado.</p>'
    renderDiskLegend(null)
    return
  }
  if (typeof Highcharts === 'undefined') {
    el.innerHTML = '<p class="panel-desc" style="padding:2rem;text-align:center">Carregando gráfico 3D…</p>'
    return
  }

  const used = Math.max(0, Number(disk.usedBytes || 0))
  const free = Math.max(0, Number(disk.freeBytes || 0))
  const title = `${disk.name || ''}${disk.label && disk.label !== disk.name ? ' · ' + disk.label : ''}`

  renderDiskLegend(disk)

  const options = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      options3d: {
        enabled: true,
        alpha: 48,
        beta: 12,
        depth: 52,
        viewDistance: 28,
      },
      animation: { duration: 700 },
      spacing: [8, 8, 8, 8],
    },
    title: {
      text: title,
      align: 'center',
      verticalAlign: 'middle',
      y: 18,
      style: {
        color: '#E8F2EC',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '0.95rem',
        fontWeight: '700',
      },
    },
    subtitle: {
      text: `${Number(disk.usedPct || 0).toFixed(1)}% usado`,
      align: 'center',
      verticalAlign: 'middle',
      y: 38,
      style: {
        color: '#8FA89B',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.75rem',
      },
    },
    tooltip: {
      backgroundColor: '#10201A',
      borderColor: 'rgba(122,168,146,0.35)',
      style: { color: '#E8F2EC', fontFamily: 'Outfit, sans-serif' },
      pointFormat: '<b>{point.percentage:.1f}%</b><br/>{point.gb}',
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        depth: 52,
        innerSize: '52%',
        size: '88%',
        borderWidth: 0,
        dataLabels: { enabled: false },
        showInLegend: false,
        states: {
          hover: { brightness: 0.08 },
        },
      },
    },
    credits: { enabled: false },
    legend: { enabled: false },
    series: [
      {
        name: 'Disco',
        type: 'pie',
        data: [
          {
            name: 'Em uso',
            y: used || 0.001,
            gb: disk.usedLabel || '',
            color: {
              linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
              stops: [
                [0, DISK_COLORS.usedBright],
                [1, DISK_COLORS.used],
              ],
            },
          },
          {
            name: 'Livre',
            y: free || 0.001,
            gb: disk.freeLabel || '',
            color: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, DISK_COLORS.freeBright],
                [1, DISK_COLORS.free],
              ],
            },
          },
        ],
      },
    ],
  }

  if (diskChart) {
    diskChart.destroy()
    diskChart = null
  }
  diskChart = Highcharts.chart('chart-disk', options)
}

function renderDiskSection(disks) {
  diskList = Array.isArray(disks) ? disks : []
  if (selectedDiskIndex >= diskList.length) selectedDiskIndex = 0
  if (!diskList.length) {
    renderDiskTabs()
    updateDiskPie(null)
    return
  }
  if (!diskInitialized && diskList.length) {
    const cIdx = diskList.findIndex((d) => String(d.name || '').toUpperCase().startsWith('C'))
    if (cIdx >= 0) selectedDiskIndex = cIdx
    diskInitialized = true
  }
  renderDiskTabs()
  updateDiskPie(diskList[selectedDiskIndex])
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
  requestAnimationFrame(() => {
    fitAddressFont($('stat-alias'))
    requestAnimationFrame(() => fitAddressFont($('stat-alias')))
  })
  $('stat-ip').textContent = m.host?.ip ? `IP ${m.host.ip}` : '—'
  $('stat-cpu').textContent = `${Number(m.cpu?.loadPct || 0).toFixed(0)}%`
  $('stat-mem').textContent = `${Number(m.memory?.usedPct || 0).toFixed(1)}%`
  $('stat-mem-detail').textContent = `${m.memory?.usedLabel || '—'} / ${m.memory?.totalLabel || '—'}`
  $('stat-uptime').textContent = m.uptime?.label || '—'
  $('stat-host').textContent = m.host?.computer || '—'

  renderDiskSection(m.disks || [])

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

function setGestorStatus(text, kind) {
  const el = $('gestor-status')
  if (!el) return
  el.textContent = text
  el.className = 'gestor-hint' + (kind === 'ok' ? ' is-ok' : kind === 'bad' ? ' is-bad' : '')
}

async function loadGestorConfig() {
  try {
    const res = await fetch('/api/gestor-config', { cache: 'no-store' })
    const data = await res.json()
    const email = data.gestorEmail || ''
    $('input-gestor-email').value = email
    if (email) {
      setGestorStatus(`Gestor autorizado: ${email}`, 'ok')
    } else {
      setGestorStatus('Nenhum gestor definido. Salve um e-mail @marinha.mil.br.', null)
    }
  } catch (err) {
    setGestorStatus('Não foi possível carregar a configuração do gestor.', 'bad')
    console.error(err)
  }
}

async function saveGestorConfig(event) {
  event.preventDefault()
  const btn = $('btn-save-gestor')
  const email = ($('input-gestor-email').value || '').trim().toLowerCase()
  btn.disabled = true
  setGestorStatus('Salvando…', null)
  try {
    const res = await fetch('/api/gestor-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gestorEmail: email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    $('input-gestor-email').value = data.gestorEmail || email
    setGestorStatus(`Salvo. Único gestor autorizado: ${data.gestorEmail || email}`, 'ok')
  } catch (err) {
    setGestorStatus(err instanceof Error ? err.message : 'Falha ao salvar', 'bad')
  } finally {
    btn.disabled = false
  }
}

function renderEmailList(ul, items, emptyText) {
  ul.innerHTML = ''
  if (!items || !items.length) {
    const li = document.createElement('li')
    li.className = 'email-empty'
    li.textContent = emptyText
    ul.appendChild(li)
    return
  }
  items.forEach((item) => {
    const li = document.createElement('li')
    const nome = item.nome ? ` · ${item.nome}` : ''
    const login = item.lastSignInAt ? ` · último login ${item.lastSignInAt}` : ''
    li.innerHTML = `
      <div class="em">${escapeHtml(item.email || '')}</div>
      <div class="meta">${escapeHtml((item.perfil || 'USUARIO') + nome + login)}</div>
    `
    ul.appendChild(li)
  })
}

function closeEmailsModal() {
  const modal = $('modal-emails')
  if (modal) modal.hidden = true
}

async function openEmailsModal() {
  const modal = $('modal-emails')
  const err = $('modal-emails-error')
  modal.hidden = false
  err.hidden = true
  err.textContent = ''
  $('list-logged-in').innerHTML = '<li class="email-empty">Carregando…</li>'
  $('list-pending').innerHTML = '<li class="email-empty">Carregando…</li>'
  try {
    const res = await fetch('/api/gestor-emails', { cache: 'no-store' })
    const data = await res.json()
    $('modal-emails-sub').textContent = data.gestorEmail
      ? `Equipe do gestor ${data.gestorEmail}`
      : 'Cadastrados pelo gestor'
    if (data.error) {
      err.hidden = false
      err.textContent = data.error
    }
    renderEmailList($('list-logged-in'), data.loggedIn, 'Nenhum e-mail com login ainda.')
    renderEmailList($('list-pending'), data.pending, 'Nenhum cadastro pendente de primeiro login.')
  } catch (e) {
    err.hidden = false
    err.textContent = e instanceof Error ? e.message : 'Falha ao carregar e-mails'
    renderEmailList($('list-logged-in'), [], '—')
    renderEmailList($('list-pending'), [], '—')
  }
}

function boot() {
  $('btn-refresh').addEventListener('click', () => void loadMetrics())
  window.addEventListener('resize', () => fitAddressFont($('stat-alias')))
  $('form-gestor').addEventListener('submit', (ev) => void saveGestorConfig(ev))
  $('btn-open-emails').addEventListener('click', () => void openEmailsModal())
  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeEmailsModal)
  })
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeEmailsModal()
  })
  void loadMetrics()
  void loadGestorConfig()
  refreshTimer = setInterval(() => void loadMetrics(), 20000)
}

document.addEventListener('DOMContentLoaded', boot)
window.addEventListener('beforeunload', () => {
  if (refreshTimer) clearInterval(refreshTimer)
})
