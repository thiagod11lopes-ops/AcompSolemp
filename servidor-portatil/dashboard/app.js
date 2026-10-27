/* Dashboard AcompOPMS — consome /api/metrics */

const $ = (id) => document.getElementById(id)

let usageChart = null
let diskChart = null
let userUsageChart = null
let refreshTimer = null
let serverPollTimer = null
let diskList = []
let selectedDiskIndex = 0
let diskInitialized = false
let serverControl = {
  running: false,
  busy: false,
  action: 'idle',
  status: 'idle',
  message: '',
  _metricsSeen: false,
  _jobEnded: false,
  _jobEndedAt: 0,
  _busySince: 0,
  _errorShown: false,
  _seenJobRunning: false,
  /** Acao pedida pelo usuario (start/stop); nao some quando a API zera action para idle. */
  _busyAction: null,
  _startAttempt: null,
}

const START_ATTEMPTS_KEY = 'acompOmpsStartAttempts'
/** Tempo maximo em loading sem stack refletir o resultado. */
const SERVER_BUSY_TIMEOUT_MS = 12 * 60 * 1000
/** Apos o job terminar, espera metricas confirmarem antes de declarar erro. */
const SERVER_JOB_END_GRACE_MS = 8 * 1000

function getStartAttemptCount() {
  const n = Number(sessionStorage.getItem(START_ATTEMPTS_KEY) || '0')
  return Number.isFinite(n) && n > 0 ? n : 0
}

function bumpStartAttemptCount() {
  const next = getStartAttemptCount() + 1
  sessionStorage.setItem(START_ATTEMPTS_KEY, String(next))
  return next
}

function busyStartLabel(attempt) {
  // 1ª tentativa: frase curta; 2ª+ : mensagem bem expressa.
  if (attempt >= 2) return 'Aguarde, servidor sendo iniciado'
  return 'Iniciando servidor…'
}

function busyStopLabel() {
  return 'Servidor sendo pausado'
}

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
        alpha: 45,
        beta: 8,
        depth: 36,
        viewDistance: 24,
      },
      animation: { duration: 500 },
      spacing: [2, 2, 2, 2],
      height: null,
    },
    title: {
      text: title,
      align: 'center',
      verticalAlign: 'middle',
      y: 10,
      style: {
        color: '#E8F2EC',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '0.78rem',
        fontWeight: '700',
      },
    },
    subtitle: {
      text: `${Number(disk.usedPct || 0).toFixed(1)}% usado`,
      align: 'center',
      verticalAlign: 'middle',
      y: 26,
      style: {
        color: '#8FA89B',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.65rem',
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
        depth: 36,
        innerSize: '54%',
        size: '78%',
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

function renderStackCheck(container, item) {
  const ok = !!item.ok
  const id = item.id || ''
  const el = document.createElement('div')
  el.className = 'row row-check'
  el.setAttribute('data-check-id', id)
  const fixBtn = ok
    ? ''
    : `<button type="button" class="btn-fix" data-fix-check="${escapeHtml(id)}">Solucionar problemas</button>`
  el.innerHTML = `
    <div class="row-check-main">
      <div>
        <div class="row-title">${escapeHtml(item.name || '')}</div>
        <span class="row-sub">${escapeHtml(item.detail || '')}</span>
      </div>
      <div class="row-check-actions">
        <span class="badge ${ok ? 'ok' : 'bad'}">${escapeHtml(item.label || (ok ? 'OK' : 'Falhou'))}</span>
        ${fixBtn}
      </div>
    </div>
    <div class="fix-guidance" hidden>
      <label class="fix-guidance-label">Como resolver</label>
      <textarea class="fix-guidance-text" readonly rows="5"></textarea>
    </div>
  `
  container.appendChild(el)
}

async function fixStackCheck(btn) {
  const id = btn.getAttribute('data-fix-check')
  if (!id) return
  const row = btn.closest('.row-check')
  const box = row && row.querySelector('.fix-guidance')
  const area = row && row.querySelector('.fix-guidance-text')
  btn.disabled = true
  const prev = btn.textContent
  btn.textContent = 'Resolvendo…'
  if (box) box.hidden = false
  if (area) area.value = 'Tentando solucionar…'
  try {
    const res = await fetch('/api/fix-check', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json().catch(() => ({}))
    const guidance =
      (data && data.guidance) ||
      (data && data.message) ||
      (data && data.error) ||
      'Nao foi possivel obter orientacao. Tente Atualizar ou o painel Iniciar Servidor.'
    if (area) area.value = guidance
    if (box) box.hidden = false
    if (data && data.started) {
      // Dá tempo da ação externa começar e atualiza o painel.
      setTimeout(() => void loadMetrics(), 2500)
    }
  } catch (err) {
    if (area) {
      area.value =
        err instanceof Error
          ? err.message
          : 'Falha de rede ao chamar Solucionar problemas. Confira se o Dashboard ainda esta aberto.'
    }
    if (box) box.hidden = false
  } finally {
    btn.disabled = false
    btn.textContent = prev || 'Solucionar problemas'
  }
}

function wireFixCheckButtons() {
  const body = $('modal-detail-body')
  if (!body || body._fixWired) return
  body._fixWired = true
  body.addEventListener('click', (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest('[data-fix-check]') : null
    if (!btn) return
    ev.preventDefault()
    void fixStackCheck(btn)
  })
}

function renderStackChecksStore(checks) {
  const store = $('stack-checks')
  if (!store) return
  store.innerHTML = ''
  const list = Array.isArray(checks) ? checks : []
  if (!list.length) {
    store.innerHTML = '<p class="panel-desc">Sem dados de status.</p>'
    return
  }
  const pre = list.filter((c) => c.group === 'pre')
  const runtime = list.filter((c) => c.group === 'runtime')
  const appendGroup = (title, items) => {
    if (!items.length) return
    const h = document.createElement('p')
    h.className = 'panel-desc stack-check-group'
    h.textContent = title
    store.appendChild(h)
    items.forEach((c) => renderStackCheck(store, c))
  }
  appendGroup('Pré-requisitos', pre)
  appendGroup('Serviços em execução', runtime)
  if (!pre.length && !runtime.length) {
    list.forEach((c) => renderStackCheck(store, c))
  }
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

function setPowerHint(text, kind) {
  const el = $('power-hint')
  if (!el) return
  const msg = (text || '').trim()
  el.hidden = !msg
  el.textContent = msg
  el.className = 'power-hint' + (kind === 'ok' ? ' is-ok' : kind === 'bad' ? ' is-bad' : '')
}

function closeServerErrorModal() {
  const modal = $('modal-server-error')
  if (modal) modal.hidden = true
}

function showServerErrorModal(title, body, sub) {
  const modal = $('modal-server-error')
  if (!modal) {
    setPowerHint(body || title || 'Falha no servidor.', 'bad')
    return
  }
  const t = $('modal-server-error-title')
  const s = $('modal-server-error-sub')
  const area = $('modal-server-error-body')
  if (t) t.textContent = title || 'Falha no servidor'
  if (s) s.textContent = sub || 'O processo nao foi concluido'
  if (area) {
    area.value = (body || '').trim() || 'Sem detalhes adicionais. Tente Iniciar de novo ou abra o atalho Iniciar Servidor OMPS.'
  }
  modal.hidden = false
}

function getBusyAction() {
  const a = serverControl._busyAction || serverControl.action
  return a === 'start' || a === 'stop' ? a : null
}

function clearServerBusy() {
  serverControl.busy = false
  serverControl._jobEnded = false
  serverControl._jobEndedAt = 0
  serverControl._busySince = 0
  serverControl._seenJobRunning = false
  serverControl._busyAction = null
  stopServerPoll()
}

function finishServerBusySuccess() {
  clearServerBusy()
  serverControl._errorShown = false
  setPowerHint('', null)
  renderServerPowerButton()
}

function finishServerBusyError(title, detail) {
  const busyAction = getBusyAction()
  if (serverControl._errorShown) {
    clearServerBusy()
    renderServerPowerButton()
    return
  }
  serverControl._errorShown = true
  clearServerBusy()
  const msg = (detail || serverControl.message || '').trim()
  const isStop = busyAction === 'stop'
  setPowerHint(title || 'Falha na operacao.', 'bad')
  showServerErrorModal(
    title || 'Falha no servidor',
    [
      msg,
      '',
      'O que fazer:',
      isStop
        ? '1. Clique em Tentar de novo (Parar) ou feche Docker/containers manualmente.'
        : '1. Confira Docker Desktop e o painel de status (se abriu).',
      '2. Use Solucionar problemas no pill de status, se algum item estiver vermelho.',
      isStop
        ? '3. Se o botao continuar em Parar, os servicos ainda respondem — tente Parar de novo.'
        : '3. Clique em Tentar de novo ou no botao Iniciar servidor.',
    ]
      .filter(Boolean)
      .join('\n'),
    isStop ? 'A parada nao foi concluida' : 'O inicio nao foi concluido',
  )
  renderServerPowerButton()
}

/** Decide se o loading do botao pode encerrar (sucesso, erro ou timeout). */
function reconcileServerBusy(stackUp) {
  if (!serverControl.busy) return

  const busyAction = getBusyAction()
  const starting = busyAction === 'start'
  const stopping = busyAction === 'stop'
  const status = serverControl.status || 'idle'
  const now = Date.now()
  const busyFor = serverControl._busySince ? now - serverControl._busySince : 0

  // Sucesso: metricas confirmam o estado desejado — so entao sai do loading.
  if (starting && stackUp) {
    finishServerBusySuccess()
    return
  }
  if (stopping && !stackUp) {
    finishServerBusySuccess()
    return
  }

  // Erro explicito do job.
  if (status === 'error') {
    finishServerBusyError(
      starting ? 'Falha ao iniciar o servidor' : 'Falha ao parar o servidor',
      serverControl.message || 'O processo retornou erro.',
    )
    return
  }

  // Job ainda em execucao: mantem loading.
  if (status === 'running') {
    if (busyFor > SERVER_BUSY_TIMEOUT_MS) {
      finishServerBusyError(
        'Tempo esgotado',
        stopping
          ? 'A parada ficou em andamento alem do tempo esperado e os servicos ainda respondem (ou nao confirmaram a queda).'
          : 'O processo ficou em andamento alem do tempo esperado e os servicos nao confirmaram o estado final.',
      )
    }
    return
  }

  // Job terminou de fato (done ou flag apos running/error) — nao usar idle antigo sem _jobEnded.
  if (serverControl._jobEnded || status === 'done') {
    const endedAt = serverControl._jobEndedAt || serverControl._busySince || now
    const sinceEnd = now - endedAt
    if (sinceEnd < SERVER_JOB_END_GRACE_MS) {
      // Aguarda metricas atualizarem (Vite/API podem responder alguns segundos depois).
      return
    }
    if (starting && !stackUp) {
      finishServerBusyError(
        'Inicio nao concluido',
        serverControl.message ||
          'O fluxo de inicio terminou, mas o frontend/API nao responderam. O painel pode ter sido interrompido ou houve falha ao subir os servicos.',
      )
      return
    }
    if (stopping && stackUp) {
      finishServerBusyError(
        'Parada nao concluida',
        serverControl.message ||
          'O processo de parada terminou, mas o frontend e/ou a API ainda respondem. O servidor nao chegou a parar por completo.',
      )
      return
    }
    // Sem start/stop conhecido: nao declarar sucesso se o stack contradiz o pedido.
    if (!starting && !stopping) {
      if (busyFor > SERVER_BUSY_TIMEOUT_MS) {
        finishServerBusyError(
          'Tempo esgotado',
          'Nao foi possivel confirmar o resultado da operacao.',
        )
      }
      return
    }
    finishServerBusySuccess()
    return
  }

  // Ainda busy sem confirmacao (ex.: idle stale): so encerra por timeout.
  if (busyFor > SERVER_BUSY_TIMEOUT_MS) {
    finishServerBusyError(
      'Tempo esgotado',
      stopping
        ? 'Nao foi possivel confirmar que o servidor parou. Os servicos podem ainda estar no ar.'
        : 'Nao foi possivel confirmar o fim do processo. Verifique se o painel de inicializacao nao ficou aberto atras do navegador.',
    )
  }
}

function serviceResponding(service) {
  if (!service) return false
  if (service.ok) return true
  const code = Number(service.code || 0)
  return code >= 200 && code < 500
}

function computeStackRunning(m) {
  if (!m) return false
  const services = m.services || []
  const byId = Object.fromEntries(services.map((s) => [s.id, s]))
  const viteUp = serviceResponding(byId.vite)
  const gatewayUp = serviceResponding(byId.gateway)
  const supabaseUp = serviceResponding(byId.supabase)
  const authUp = serviceResponding(byId.authGw)
  // "Iniciado" = frontend + pelo menos uma API/gateway no ar.
  // Só Vite/Docker abertos (resto offline) conta como PARADO → botão Iniciar.
  const apiUp = supabaseUp || authUp || gatewayUp
  return viteUp && apiUp
}

function renderServerPowerButton() {
  const btn = $('btn-server-power')
  if (!btn) return
  const busy = !!serverControl.busy
  const running = !!serverControl.running
  const mode = busy ? 'busy' : running ? 'stop' : 'start'
  btn.className = `power-btn is-${mode}`
  btn.disabled = busy
  const label = $('power-label')
  const kicker = $('power-kicker')
  if (busy) {
    const starting = getBusyAction() === 'start'
    const attempt = serverControl._startAttempt || getStartAttemptCount() || 1
    if (starting) {
      if (label) label.textContent = busyStartLabel(attempt)
      if (kicker) kicker.textContent = attempt >= 2 ? 'Aguarde' : 'Servidor OMPS'
      btn.title = busyStartLabel(attempt)
      const waitingServices = serverControl._jobEnded && serverControl.status !== 'error'
      setPowerHint(
        waitingServices
          ? 'Fluxo finalizado — confirmando serviços…'
          : attempt >= 2
            ? 'Aguarde, servidor sendo iniciado…'
            : serverControl.message || 'Subindo serviços…',
        null,
      )
    } else {
      if (label) label.textContent = busyStopLabel()
      if (kicker) kicker.textContent = 'Aguarde'
      btn.title = busyStopLabel()
      setPowerHint(serverControl.message || 'Servidor sendo pausado…', null)
    }
  } else if (running) {
    if (label) label.textContent = 'Parar servidor'
    if (kicker) kicker.textContent = 'Em execução'
    btn.title = 'Parar Servidor OMPS'
    if (serverControl.status === 'error') setPowerHint(serverControl.message || 'Falha na última operação.', 'bad')
    else setPowerHint('', null)
  } else {
    if (label) label.textContent = 'Iniciar servidor'
    if (kicker) kicker.textContent = 'Servidor parado'
    btn.title = 'Iniciar Servidor OMPS'
    if (serverControl.status === 'error') setPowerHint(serverControl.message || 'Falha na última operação.', 'bad')
    else setPowerHint('', null)
  }
}

function applyServerControl(data) {
  if (!data || typeof data !== 'object') return
  const prevAttempt = serverControl._startAttempt
  const prevStatus = serverControl.status
  const wasBusy = !!serverControl.busy
  const status = data.status || 'idle'
  let action = data.action || serverControl.action || 'idle'

  // Enquanto o botao esta busy, a API pode zerar action para idle no finally —
  // preservamos start/stop em _busyAction para reconciliar certo.
  if (wasBusy && serverControl._busyAction) {
    if (action === 'idle' || !action) action = serverControl._busyAction
    else if (action === 'start' || action === 'stop') serverControl._busyAction = action
  } else if ((action === 'start' || action === 'stop') && (status === 'running' || wasBusy)) {
    serverControl._busyAction = action
  }

  serverControl.action = action
  serverControl.status = status
  serverControl.message = data.message || ''

  if (typeof data._startAttempt === 'number') {
    serverControl._startAttempt = data._startAttempt
  } else if (serverControl.busy && getBusyAction() === 'start') {
    serverControl._startAttempt = prevAttempt || getStartAttemptCount() || 1
  }

  // Job ativo na API: mantem/inicia loading.
  if (status === 'running') {
    serverControl.busy = true
    serverControl._seenJobRunning = true
    serverControl._jobEnded = false
    serverControl._jobEndedAt = 0
    if (!serverControl._busySince) serverControl._busySince = Date.now()
  } else if (wasBusy && (status === 'done' || status === 'idle' || status === 'error')) {
    // Ignora idle "antigo" da API logo apos o clique (antes do POST gravar running).
    const jobReallyEnded =
      status === 'error' ||
      status === 'done' ||
      serverControl._seenJobRunning ||
      prevStatus === 'running'
    if (jobReallyEnded && !serverControl._jobEnded) {
      serverControl._jobEnded = true
      serverControl._jobEndedAt = Date.now()
    }
  }

  // running vem das metricas (mais confiavel); API so sugere se ainda nao houver leitura.
  if (typeof data.running === 'boolean' && serverControl._metricsSeen !== true) {
    serverControl.running = !!data.running
  }
  renderServerPowerButton()
  if (serverControl.busy) startServerPoll()
  reconcileServerBusy(!!serverControl.running)
}

async function loadServerControl() {
  try {
    const res = await fetch('/api/server', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    applyServerControl(await res.json())
  } catch (err) {
    console.error(err)
  }
}

function startServerPoll() {
  if (serverPollTimer) return
  serverPollTimer = setInterval(() => {
    void loadServerControl()
    void loadMetrics()
  }, 2000)
}

function stopServerPoll() {
  if (!serverPollTimer) return
  clearInterval(serverPollTimer)
  serverPollTimer = null
}

async function toggleServerPower() {
  const btn = $('btn-server-power')
  if (!btn || btn.disabled) return
  const action = serverControl.running ? 'stop' : 'start'
  btn.disabled = true

  serverControl._errorShown = false
  serverControl._jobEnded = false
  serverControl._jobEndedAt = 0
  serverControl._seenJobRunning = false
  serverControl._busyAction = action
  serverControl._busySince = Date.now()
  serverControl.busy = true
  serverControl.action = action
  serverControl.status = 'running'
  serverControl.message = action === 'start' ? 'Solicitando inicio…' : 'Solicitando parada…'

  if (action === 'start') {
    const attempt = bumpStartAttemptCount()
    serverControl._startAttempt = attempt
    renderServerPowerButton()
    setPowerHint(
      attempt >= 2 ? 'Aguarde, servidor sendo iniciado…' : 'Solicitando início…',
      null,
    )
  } else {
    serverControl._startAttempt = null
    renderServerPowerButton()
    setPowerHint('Servidor sendo pausado…', null)
  }
  startServerPoll()

  try {
    const res = await fetch(`/api/server/${action}`, { method: 'POST', cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    applyServerControl({
      ...data,
      action: data.action || action,
      status: data.status || 'running',
      _startAttempt: action === 'start' ? serverControl._startAttempt : undefined,
    })
  } catch (err) {
    finishServerBusyError(
      action === 'start' ? 'Falha ao iniciar o servidor' : 'Falha ao parar o servidor',
      err instanceof Error ? err.message : 'Falha ao acionar o servidor.',
    )
    void loadServerControl()
  }
}

function applyMetrics(m) {
  const servicesOk = (m.services || []).filter((s) => s.ok).length
  const servicesTotal = (m.services || []).length
  const dockerOk = !!m.docker?.running
  const checks = Array.isArray(m.stackChecks) ? m.stackChecks : []
  const summary = m.stackSummary || {}
  const stackOkCount =
    typeof summary.ok === 'number' ? summary.ok : checks.filter((c) => c.ok).length
  const stackTotal =
    typeof summary.total === 'number' ? summary.total : checks.length || servicesTotal
  const allOk =
    typeof summary.allOk === 'boolean'
      ? summary.allOk
      : stackTotal > 0 && stackOkCount === stackTotal

  const stackUp = computeStackRunning(m)
  serverControl._metricsSeen = true
  serverControl.running = stackUp
  // Loading so termina com sucesso (stack ok) ou erro/timeout — nunca so porque status != running.
  reconcileServerBusy(stackUp)
  renderServerPowerButton()

  renderStackChecksStore(
    checks.length
      ? checks
      : [
          {
            id: 'docker',
            group: 'pre',
            name: 'Docker Desktop',
            ok: dockerOk,
            label: dockerOk ? 'Pronto' : 'Offline',
            detail: dockerOk ? 'Docker Desktop em execução' : 'Docker offline',
          },
          ...(m.services || []).map((s) => ({
            id: s.id,
            group: 'runtime',
            name: s.name,
            ok: !!s.ok,
            label: s.label || (s.ok ? 'Online' : 'Offline'),
            detail: s.url || '',
          })),
        ],
  )

  const pill = $('pill-status')
  const pillBase = 'pill pill-click '
  if (allOk) {
    pill.textContent = 'Sistema operacional'
    pill.className = pillBase + 'is-ok'
  } else if (stackTotal > 0) {
    pill.textContent = `${stackOkCount}/${stackTotal} itens OK`
    pill.className = pillBase + (dockerOk || stackOkCount > 0 ? 'is-warn' : 'is-bad')
  } else {
    pill.textContent = dockerOk ? `${servicesOk}/${servicesTotal} serviços OK` : 'Docker offline'
    pill.className = pillBase + (dockerOk ? 'is-warn' : 'is-bad')
  }
  const subAttr = allOk
    ? 'Todos os itens OK'
    : `${stackOkCount} de ${stackTotal} itens OK — clique para ver detalhes`
  pill.setAttribute('data-detail-sub', subAttr)

  $('updated-at').textContent = fmtTime(m.generatedAt)
  if (!getAliasCard()?.classList.contains('is-editing') && !aliasJobBusy) {
    syncAliasDisplay(m.host?.alias || '')
  }
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

  syncDetailModalBody()
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
    $('pill-status').className = 'pill pill-click is-bad'
    console.error(err)
  } finally {
    btn.disabled = false
  }
}

function setGestorStatus(text, kind) {
  const el = $('gestor-status')
  if (!el) return
  const msg = (text || '').trim()
  el.hidden = !msg
  el.textContent = msg
  el.className = 'gestor-hint' + (kind === 'ok' ? ' is-ok' : kind === 'bad' ? ' is-bad' : '')
}

function shortUserLabel(user) {
  const nome = (user.nome || '').trim()
  if (nome && !nome.includes('@')) {
    return nome.length > 22 ? `${nome.slice(0, 20)}…` : nome
  }
  const email = user.email || ''
  const local = email.split('@')[0] || email
  return local.length > 22 ? `${local.slice(0, 20)}…` : local
}

function updateUserUsageChart(payload) {
  const note = $('user-usage-note')
  const users = Array.isArray(payload?.users) ? payload.users : []
  if (payload?.error) {
    note.textContent = payload.error
  } else if (!users.length) {
    note.textContent = 'Nenhum usuário cadastrado para exibir.'
  } else {
    note.textContent = `${users.length} usuário(s) · tempo estimado pelas sessões no Supabase.`
  }

  const ctx = $('chart-user-usage')
  if (!ctx || typeof Chart === 'undefined') return

  const labels = users.map(shortUserLabel)
  const valuesHours = users.map((u) => Number(u.hours || 0))
  const durationLabels = users.map((u) => u.label || '0 min')

  const data = {
    labels,
    datasets: [
      {
        label: 'Horas',
        data: valuesHours,
        borderRadius: 10,
        borderSkipped: false,
        backgroundColor: (ctx) => {
          const i = ctx.dataIndex || 0
          const palette = ['#7AA892', '#558B71', '#3F6B56', '#A8C4B4', '#E0A84A']
          return palette[i % palette.length]
        },
        maxBarThickness: 28,
      },
    ],
  }

  if (userUsageChart) {
    userUsageChart.data = data
    userUsageChart.options.plugins.tooltip.callbacks = {
      label(ctx) {
        const i = ctx.dataIndex
        return durationLabels[i] || `${ctx.parsed.x} h`
      },
    }
    userUsageChart.update('none')
    return
  }

  userUsageChart = new Chart(ctx, {
    type: 'bar',
    data,
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#10201A',
          titleColor: '#E8F2EC',
          bodyColor: '#8FA89B',
          borderColor: 'rgba(122,168,146,0.3)',
          borderWidth: 1,
          callbacks: {
            label(ctx) {
              const i = ctx.dataIndex
              return durationLabels[i] || `${ctx.parsed.x} h`
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Horas',
            color: '#8FA89B',
            font: { family: 'Outfit', size: 11 },
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#8FA89B',
            font: { family: 'JetBrains Mono', size: 10 },
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#E8F2EC',
            font: { family: 'Outfit', size: 11, weight: '600' },
          },
        },
      },
      animation: { duration: 650 },
    },
  })
}

async function loadUserUsage() {
  try {
    const res = await fetch('/api/gestor-usage', { cache: 'no-store' })
    const data = await res.json()
    updateUserUsageChart(data)
  } catch (err) {
    updateUserUsageChart({ users: [], error: 'Falha ao carregar tempo de uso.' })
    console.error(err)
  }
}

async function loadGestorConfig() {
  try {
    const res = await fetch('/api/gestor-config', { cache: 'no-store' })
    const data = await res.json()
    const email = data.gestorEmail || ''
    const input = $('input-gestor-email')
    if (input && !input.value.trim() && email) input.value = email
    setGestorStatus('', null)
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
    setGestorStatus('Salvo.', 'ok')
    void loadUserUsage()
  } catch (err) {
    setGestorStatus(err instanceof Error ? err.message : 'Falha ao salvar', 'bad')
  } finally {
    btn.disabled = false
  }
}

let lastKnownAlias = ''

function setAliasStatus(text, kind) {
  const el = $('alias-status')
  if (!el) return
  el.textContent = text || ''
  el.className = 'alias-status' + (kind === 'ok' ? ' is-ok' : kind === 'bad' ? ' is-bad' : '')
}

function syncAliasDisplay(alias) {
  const value = (alias || '').trim()
  if (value) lastKnownAlias = value
  const el = $('stat-alias')
  if (!el) return
  el.textContent = value || '—'
  requestAnimationFrame(() => {
    fitAddressFont(el)
    requestAnimationFrame(() => fitAddressFont(el))
  })
}

function getAliasCard() {
  return document.querySelector('.stat-address')
}

function openAliasEdit() {
  const card = getAliasCard()
  const input = $('input-alias')
  if (!card || !input) return
  const current = (lastKnownAlias || $('stat-alias')?.textContent || '').trim()
  input.value = current === '—' ? '' : current
  card.classList.add('is-editing')
  setAliasStatus('', null)
  input.focus()
  input.select()
}

function closeAliasEdit() {
  const card = getAliasCard()
  if (card) card.classList.remove('is-editing')
  setAliasStatus('', null)
  syncAliasDisplay(lastKnownAlias)
}

const ALIAS_STEP_DEFAULTS = [
  {
    id: 'aplicar-host',
    label: 'Aplicar-Host (config, hosts local, URLs do app/Supabase)',
  },
  {
    id: 'preparar-https',
    label: 'Preparar-Https (gerar cert com o novo alias + IP)',
  },
  {
    id: 'reiniciar-gateway',
    label: 'Reiniciar o gateway (passar a usar o cert novo)',
  },
  {
    id: 'dns-local',
    label: 'Atualizar DNS local do alias (porta 53), se estiver ativo',
  },
  {
    id: 'supabase-url',
    label: 'Recriar/reiniciar serviços Supabase que dependem da URL pública',
  },
]

let aliasJobPollTimer = null
let aliasJobBusy = false

function stopAliasJobPoll() {
  if (aliasJobPollTimer) {
    clearInterval(aliasJobPollTimer)
    aliasJobPollTimer = null
  }
}

function markForAliasStep(status) {
  if (status === 'ok') return '✓'
  if (status === 'warn') return '!'
  if (status === 'error') return '×'
  if (status === 'running') return '…'
  return ''
}

function renderAliasProgressSteps(steps) {
  const list = $('alias-progress-steps')
  if (!list) return
  const source =
    Array.isArray(steps) && steps.length
      ? steps
      : ALIAS_STEP_DEFAULTS.map((s) => ({ ...s, status: 'pending', detail: '' }))
  list.innerHTML = source
    .map((step) => {
      const status = String(step.status || 'pending')
      const label = escapeHtml(step.label || step.id || '')
      const detail = step.detail ? `<p class="alias-progress-detail">${escapeHtml(step.detail)}</p>` : ''
      return `
        <li class="alias-progress-item is-${escapeHtml(status)}">
          <span class="alias-progress-mark" aria-hidden="true">${markForAliasStep(status)}</span>
          <div>
            <p class="alias-progress-label">${label}</p>
            ${detail}
          </div>
        </li>
      `
    })
    .join('')
}

function setAliasProgressCloseable(canClose) {
  const btn = $('btn-close-alias-progress')
  const btnX = $('btn-close-alias-progress-x')
  if (btn) btn.hidden = !canClose
  if (btnX) btnX.hidden = !canClose
  aliasJobBusy = !canClose
}

function openAliasProgressModal(alias) {
  const modal = $('modal-alias-progress')
  if (!modal) return
  $('modal-alias-title').textContent = 'Aplicando novo endereço'
  $('modal-alias-sub').textContent = alias
    ? `Alinhando rede para ${alias}…`
    : 'Alinhando rede, HTTPS e serviços…'
  const msg = $('alias-progress-message')
  if (msg) {
    msg.textContent = 'Iniciando…'
    msg.className = 'alias-progress-message'
  }
  renderAliasProgressSteps(ALIAS_STEP_DEFAULTS.map((s) => ({ ...s, status: 'pending', detail: '' })))
  setAliasProgressCloseable(false)
  modal.hidden = false
}

function closeAliasProgressModal() {
  if (aliasJobBusy) return
  stopAliasJobPoll()
  const modal = $('modal-alias-progress')
  if (modal) modal.hidden = true
}

function applyAliasJobSnapshot(job) {
  if (!job) return
  renderAliasProgressSteps(job.steps || [])
  const status = String(job.status || 'idle')
  const msg = $('alias-progress-message')
  const appliedAlias = (job.alias || '').trim()
  if (appliedAlias) {
    lastKnownAlias = appliedAlias
    syncAliasDisplay(appliedAlias)
    $('modal-alias-sub').textContent = `Alinhando rede para ${appliedAlias}…`
  }
  if (job.ip) $('stat-ip').textContent = `IP ${job.ip}`

  if (msg) {
    msg.textContent = job.message || ''
    if (status === 'done') msg.className = 'alias-progress-message is-ok'
    else if (status === 'error') msg.className = 'alias-progress-message is-bad'
    else msg.className = 'alias-progress-message'
  }

  if (status === 'done' || status === 'error') {
    setAliasProgressCloseable(true)
    stopAliasJobPoll()
    if (status === 'done') {
      $('modal-alias-title').textContent = 'Endereço aplicado'
      $('modal-alias-sub').textContent = appliedAlias
        ? `Novo acesso: https://${appliedAlias}`
        : 'Rede alinhada ao novo endereço'
      void loadMetrics()
    } else {
      $('modal-alias-title').textContent = 'Falha ao aplicar endereço'
      $('modal-alias-sub').textContent = 'Veja o item com erro abaixo'
    }
  } else {
    setAliasProgressCloseable(false)
  }
}

async function pollAliasJobOnce() {
  try {
    const res = await fetch('/api/network-alias', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    applyAliasJobSnapshot(data.job || data)
    if (data.alias) {
      lastKnownAlias = data.alias
      if (!aliasJobBusy) syncAliasDisplay(data.alias)
    }
    if (data.ip && (data.job?.status === 'done' || !data.job)) {
      $('stat-ip').textContent = `IP ${data.ip}`
    }
  } catch (err) {
    console.error(err)
  }
}

function startAliasJobPoll() {
  stopAliasJobPoll()
  void pollAliasJobOnce()
  aliasJobPollTimer = setInterval(() => void pollAliasJobOnce(), 900)
}

async function confirmAliasEdit() {
  const input = $('input-alias')
  const btnConfirm = $('btn-confirm-alias')
  const btnCancel = $('btn-cancel-alias')
  const btnEdit = $('btn-edit-alias')
  if (!input) return
  const alias = (input.value || '').trim().toLowerCase()
  if (alias.length < 3) {
    setAliasStatus('Informe um endereço válido (ex.: sistema.acompomps.rede).', 'bad')
    input.focus()
    return
  }
  if (!/^[a-z0-9]([a-z0-9\-.]*[a-z0-9])?$/.test(alias)) {
    setAliasStatus('Use apenas letras, números, ponto e hífen.', 'bad')
    input.focus()
    return
  }
  const previous = lastKnownAlias
  if (alias === previous) {
    closeAliasEdit()
    return
  }
  const ok = window.confirm(
    `Alterar o endereço de acesso na rede?\n\nDe: ${previous || '—'}\nPara: ${alias}\n\nOs outros PCs precisarão usar o novo nome.`
  )
  if (!ok) return

  btnConfirm && (btnConfirm.disabled = true)
  btnCancel && (btnCancel.disabled = true)
  btnEdit && (btnEdit.disabled = true)
  setAliasStatus('Iniciando aplicação…', null)
  try {
    const res = await fetch('/api/network-alias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    closeAliasEdit()
    openAliasProgressModal(alias)
    applyAliasJobSnapshot(data.job || {
      status: 'running',
      alias,
      message: 'Iniciando…',
      steps: ALIAS_STEP_DEFAULTS.map((s) => ({ ...s, status: 'pending', detail: '' })),
    })
    startAliasJobPoll()
  } catch (err) {
    setAliasStatus(err instanceof Error ? err.message : 'Falha ao alterar endereço', 'bad')
  } finally {
    btnConfirm && (btnConfirm.disabled = false)
    btnCancel && (btnCancel.disabled = false)
    btnEdit && (btnEdit.disabled = false)
  }
}

function wireAliasEdit() {
  const btnEdit = $('btn-edit-alias')
  const btnConfirm = $('btn-confirm-alias')
  const btnCancel = $('btn-cancel-alias')
  const input = $('input-alias')
  if (btnEdit) btnEdit.addEventListener('click', openAliasEdit)
  if (btnCancel) btnCancel.addEventListener('click', closeAliasEdit)
  if (btnConfirm) btnConfirm.addEventListener('click', () => void confirmAliasEdit())
  if (input) {
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault()
        void confirmAliasEdit()
      } else if (ev.key === 'Escape') {
        ev.preventDefault()
        closeAliasEdit()
      }
    })
  }
  document.querySelectorAll('[data-close-alias-progress]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      if (aliasJobBusy) {
        ev.preventDefault()
        ev.stopPropagation()
        return
      }
      closeAliasProgressModal()
    })
  })
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

let activeDetailTarget = null

function closeEmailsModal() {
  const modal = $('modal-emails')
  if (modal) modal.hidden = true
}

function closeDetailModal() {
  const modal = $('modal-detail')
  if (modal) modal.hidden = true
  activeDetailTarget = null
}

function syncDetailModalBody() {
  if (!activeDetailTarget) return
  const source = $(activeDetailTarget)
  const body = $('modal-detail-body')
  if (!source || !body) return
  body.innerHTML = source.innerHTML || '<p class="panel-desc">Sem dados para exibir.</p>'
  if (activeDetailTarget === 'containers') {
    const sub = $('modal-detail-sub')
    const summary = $('docker-summary')
    if (sub && summary) sub.textContent = summary.textContent || ''
  }
  if (activeDetailTarget === 'stack-checks') {
    const pill = $('pill-status')
    const sub = $('modal-detail-sub')
    if (sub && pill) {
      sub.textContent = pill.getAttribute('data-detail-sub') || 'Itens necessários para funcionar'
    }
  }
}

function openDetailModal(btn) {
  const target = btn.getAttribute('data-detail-target')
  const title = btn.getAttribute('data-detail-title') || 'Detalhes'
  let sub = btn.getAttribute('data-detail-sub') || ''
  if (target === 'containers') {
    sub = ($('docker-summary') && $('docker-summary').textContent) || sub
  }
  if (target === 'stack-checks') {
    sub = btn.getAttribute('data-detail-sub') || 'Itens necessários para funcionar'
  }
  activeDetailTarget = target
  const modal = $('modal-detail')
  $('modal-detail-title').textContent = title
  $('modal-detail-sub').textContent = sub
  syncDetailModalBody()
  if (modal) modal.hidden = false
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
    } else {
      err.hidden = true
      err.textContent = ''
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

function wireDetailPanels() {
  document.querySelectorAll('[data-detail-open]').forEach((btn) => {
    btn.addEventListener('click', () => openDetailModal(btn))
  })
  document.querySelectorAll('[data-close-detail]').forEach((el) => {
    el.addEventListener('click', closeDetailModal)
  })
}

function closeAnyModal() {
  closeEmailsModal()
  closeDetailModal()
  closeServerErrorModal()
  closeAliasProgressModal()
}

function wireServerErrorModal() {
  document.querySelectorAll('[data-close-server-error]').forEach((el) => {
    el.addEventListener('click', closeServerErrorModal)
  })
  const retry = $('btn-server-error-retry')
  if (retry) {
    retry.addEventListener('click', () => {
      closeServerErrorModal()
      if (!serverControl.busy) void toggleServerPower()
    })
  }
}

function setBootLoaderText(text) {
  const el = $('boot-loader-text')
  if (el) el.textContent = text
}

function hideBootLoader() {
  const loader = $('boot-loader')
  document.body.classList.remove('is-loading')
  if (!loader) return
  loader.classList.add('is-done')
  loader.setAttribute('aria-busy', 'false')
  window.setTimeout(() => {
    loader.hidden = true
  }, 420)
}

async function bootLoad() {
  setBootLoaderText('Coletando métricas do servidor…')
  const tasks = [
    loadMetrics().then(() => setBootLoaderText('Lendo configuração do gestor…')),
    loadGestorConfig(),
    loadUserUsage().then(() => setBootLoaderText('Montando gráficos…')),
    loadServerControl(),
  ]
  await Promise.allSettled(tasks)
  setBootLoaderText('Quase pronto…')
  requestAnimationFrame(() => {
    fitAddressFont($('stat-alias'))
    hideBootLoader()
  })
}

function boot() {
  $('btn-refresh').addEventListener('click', () => void loadMetrics())
  const powerBtn = $('btn-server-power')
  if (powerBtn) powerBtn.addEventListener('click', () => void toggleServerPower())
  window.addEventListener('resize', () => fitAddressFont($('stat-alias')))
  $('form-gestor').addEventListener('submit', (ev) => void saveGestorConfig(ev))
  $('btn-open-emails').addEventListener('click', () => void openEmailsModal())
  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeEmailsModal)
  })
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      const aliasModal = $('modal-alias-progress')
      if (aliasModal && !aliasModal.hidden) {
        if (!aliasJobBusy) closeAliasProgressModal()
        return
      }
      const card = getAliasCard()
      if (card?.classList.contains('is-editing')) {
        closeAliasEdit()
        return
      }
      closeAnyModal()
    }
  })
  wireAliasEdit()
  wireDetailPanels()
  wireFixCheckButtons()
  wireServerErrorModal()
  void bootLoad()
  refreshTimer = setInterval(() => {
    void loadMetrics()
    void loadUserUsage()
    void loadServerControl()
  }, 20000)
}

document.addEventListener('DOMContentLoaded', boot)
window.addEventListener('beforeunload', () => {
  if (refreshTimer) clearInterval(refreshTimer)
  stopAliasJobPoll()
  stopServerPoll()
})
