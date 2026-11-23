/**
 * Etapa 4 — teste geral servidor LAN (build + Caddy + Supabase via proxy).
 * Prefira: rodar-testes-lan.ps1 / rodar-testes-lan.sh
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadServidorEnv } from './lib/load-servidor-env.mjs'
import { ensureServidorLanNodeModules } from './lib/ensure-test-deps.mjs'

const lanDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(lanDir, '../..')
const cfg = loadServidorEnv(resolve(lanDir, 'servidor.env'))
const { publicOrigin, supabasePublicUrl, lanHost, httpPort } = cfg

const results = []
const ok = (n, d = '') => {
  results.push({ name: n, ok: true, detail: d || undefined })
  console.log(`✅ ${n}${d ? ` — ${d}` : ''}`)
}
const fail = (n, e) => {
  const d = e instanceof Error ? e.message : String(e)
  results.push({ name: n, ok: false, detail: d })
  console.error(`❌ ${n} — ${d}`)
}

function readEnvFile(path, key) {
  if (!existsSync(path)) return null
  const m = readFileSync(path, 'utf8').match(new RegExp(`^${key}=(.+)$`, 'm'))
  return m ? m[1].trim() : null
}

async function preflight() {
  if (!existsSync(join(root, 'frontend/dist/index.html'))) {
    throw new Error('frontend/dist ausente. Rode build-producao-lan.')
  }

  const manifest = join(root, 'frontend/dist/lan-build.json')
  if (existsSync(manifest)) {
    const m = JSON.parse(readFileSync(manifest, 'utf8'))
    if (m.publicOrigin !== publicOrigin.replace(/\/+$/, '')) {
      fail('Build LAN (lan-build.json)', `esperado ${publicOrigin}, encontrado ${m.publicOrigin}`)
    } else {
      ok('Build LAN (lan-build.json)', m.publicOrigin)
    }
  } else {
    fail('Build LAN (lan-build.json)', 'arquivo ausente — refaca build-producao-lan')
  }

  try {
    const r = await fetch(`http://127.0.0.1:${httpPort}/`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    ok('Caddy respondendo (localhost)', `HTTP ${r.status}`)
  } catch (e) {
    fail('Caddy respondendo (localhost)', e)
    throw new Error('Caddy nao responde. Rode start-servidor-lan.')
  }
}

async function resolveAnonKey() {
  let anon =
    process.env.VITE_SUPABASE_ANON_KEY ||
    readEnvFile(resolve(root, 'frontend/.env.production.local'), 'VITE_SUPABASE_ANON_KEY') ||
    readEnvFile(resolve(root, 'frontend/.env'), 'VITE_SUPABASE_ANON_KEY')

  if (!anon) {
    const { execSync } = await import('node:child_process')
    anon = execSync('supabase status -o env', { cwd: root, encoding: 'utf8' })
      .split('\n')
      .find((l) => l.startsWith('ANON_KEY='))
      ?.replace(/^ANON_KEY="?|"$/g, '')
      ?.replace(/"$/, '')
  }
  if (!anon) throw new Error('Nao foi possivel obter ANON_KEY (supabase status)')
  return anon
}

async function waitForAppStateRealtimeEvent(client, tenantId) {
  // A primeira conexao inicializa o tenant Realtime e pode derrubar o WebSocket
  // ou confirmar SUBSCRIBED antes de o slot de replicacao entregar mudancas.
  // A segunda tentativa ainda precisa receber o evento; timeout continua valendo.
  let lastError = new Error('sem evento realtime')
  for (let attempt = 1; attempt <= 2; attempt++) {
    let got = false
    const version = `lan-rt-${attempt}-${Date.now()}`
    const ch = client.channel(`lan-rt:${tenantId}:${attempt}:${version}`).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state', filter: `tenant_id=eq.${tenantId}` },
      () => {
        got = true
      },
    )
    try {
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('subscribe timeout')), 12000)
        ch.subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(t)
            resolve()
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(t)
            reject(new Error(err instanceof Error ? err.message : status))
          }
        })
      })
      const { error } = await client.rpc('save_app_state_for_tenant', {
        p_tenant_id: tenantId,
        p_version: version,
        p_payload: { clinicas: [{ id: 'cli-1', nome: 'RT', ativa: true }], pedidos: [] },
      })
      if (error) throw error
      const deadline = Date.now() + 8000
      while (!got && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200))
      if (got) return true
      lastError = new Error('sem evento realtime')
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    } finally {
      await client.removeChannel(ch)
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 3000))
  }
  throw lastError
}

async function main() {
  ensureServidorLanNodeModules()
  const { createClient } = await import('@supabase/supabase-js')

  console.log(`LAN host: ${lanHost}:${httpPort}`)
  console.log(`Origem publica: ${publicOrigin}`)
  console.log(`Supabase client URL: ${supabasePublicUrl}`)

  await preflight()

  const ANON = await resolveAnonKey()
  const URL = supabasePublicUrl

  for (const label of [`localhost:${httpPort}`, `${lanHost}:${httpPort}`]) {
    const base = label.startsWith('localhost') ? `http://localhost:${httpPort}` : publicOrigin
    try {
      const r = await fetch(`${base}/`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const html = await r.text()
      if (!html.includes('root')) throw new Error('HTML inesperado')
      ok(`HTTP UI (${label})`, `HTTP ${r.status}`)
    } catch (e) {
      fail(`HTTP UI (${label})`, e)
    }
  }

  try {
    const r = await fetch(`${publicOrigin}/login`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const html = await r.text()
    if (!html.includes('root')) throw new Error('SPA nao servida em /login')
    ok('Rota /login', `HTTP ${r.status}`)
  } catch (e) {
    fail('Rota /login', e)
  }

  try {
    const r = await fetch(`${publicOrigin}/server-connection.json`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const conn = await r.json()
    if (conn.lan?.loginUrl !== cfg.loginUrl) {
      throw new Error(`loginUrl ${conn.lan?.loginUrl} != ${cfg.loginUrl}`)
    }
    if (conn.schema !== 'acomopms-server-connection/1') throw new Error('schema inesperado')
    ok('server-connection.json', conn.lan?.loginUrl)
  } catch (e) {
    fail('server-connection.json', e)
  }

  try {
    const r = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON } })
    ok('REST via proxy LAN', `HTTP ${r.status}`)
  } catch (e) {
    fail('REST via proxy LAN', e)
  }

  try {
    const email = `lan.edge.${Date.now()}@marinha.mil.br`
    const r = await fetch(`${URL}/functions/v1/signup-with-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'senha123456' }),
    })
    const body = await r.json()
    if (!r.ok || !body.ok) throw new Error(JSON.stringify(body))
    ok('Edge Function', body.userId)
  } catch (e) {
    fail('Edge Function', e)
  }

  const email = `lan.gestor.${Date.now()}@marinha.mil.br`
  const password = 'senha123456'
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })

  let userId = null
  let session = null
  try {
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) throw error
    userId = data.user?.id
    ok('Auth signUp', email)
  } catch (e) {
    fail('Auth signUp', e)
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    session = data.session
    ok('Auth signIn', userId?.slice(0, 8))
  } catch (e) {
    fail('Auth signIn', e)
  }

  if (session) {
    await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  }

  let tenantId = null
  if (userId && session) {
    try {
      const orgCode = `LAN${Date.now().toString(36).toUpperCase()}`
      const { data: tenant, error: tErr } = await client
        .from('tenants')
        .insert({ org_code: orgCode, owner_user_id: userId, owner_email: email })
        .select('id')
        .single()
      if (tErr) throw tErr
      tenantId = tenant.id
      await client.from('profiles').insert({
        id: userId,
        tenant_id: tenantId,
        app_user_id: `user-owner-${tenantId}`,
        email,
        perfil: 'GESTOR',
      })
      const payload = {
        clinicas: [{ id: 'cli-1', nome: 'LAN Teste', ativa: true }],
        pedidos: [],
        usuarios: [],
        historico: [],
        notificacoes: [],
        credenciais: [],
        workflowEtapas: [],
        solemp: [],
        notasFiscais: [],
        reversoes: [],
        processosArquivados: [],
        chatMensagens: [],
        pedidoPlanilhaEnvio: {},
      }
      const { error: sErr } = await client.rpc('save_app_state_for_tenant', {
        p_tenant_id: tenantId,
        p_version: 'lan-1',
        p_payload: payload,
      })
      if (sErr) throw sErr
      ok('Gravacao app_state', tenantId.slice(0, 8))
    } catch (e) {
      fail('Gravacao app_state', e)
    }

    try {
      const { data, error } = await client.from('app_state').select('payload').eq('tenant_id', tenantId).maybeSingle()
      if (error) throw error
      if (!data?.payload?.clinicas?.length) throw new Error('leitura vazia')
      ok('Leitura app_state', `${data.payload.clinicas.length} clinica(s)`)
    } catch (e) {
      fail('Leitura app_state', e)
    }

    try {
      const path = `${tenantId}/ped-1/a1/lan.txt`
      const blob = new Blob(['anexo lan'], { type: 'text/plain' })
      const { error: upErr } = await client.storage.from('planilha-anexos').upload(path, blob, { upsert: true })
      if (upErr) throw upErr
      const { data, error: dlErr } = await client.storage.from('planilha-anexos').download(path)
      if (dlErr) throw dlErr
      ok('Storage anexos', await data.text())
    } catch (e) {
      fail('Storage anexos', e)
    }

    try {
      await waitForAppStateRealtimeEvent(client, tenantId)
      ok('Realtime app_state', 'evento OK')
    } catch (e) {
      fail('Realtime app_state', e)
    }
  }

  const passed = results.filter((r) => r.ok).length
  const report = {
    at: new Date().toISOString(),
    publicOrigin,
    passed,
    total: results.length,
    results,
  }
  writeFileSync(resolve(lanDir, 'test-report-lan.json'), JSON.stringify(report, null, 2), 'utf8')

  console.log('\n===== RESUMO =====')
  console.log(`${passed}/${results.length} OK`)
  console.log(`Relatorio: ${resolve(lanDir, 'test-report-lan.json')}`)
  console.log(`\nURL para outros dispositivos (mesma rede):\n  ${publicOrigin}/login\n`)

  if (results.some((r) => !r.ok)) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
