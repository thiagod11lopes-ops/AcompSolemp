/**
 * Teste geral Etapa 4A — servidor LAN (build + Caddy + Supabase via proxy).
 * Pré-requisitos: supabase start, schema aplicado, build-producao-lan, start-servidor-lan.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadServidorEnv } from './lib/load-servidor-env.mjs'

const lanDir = dirname(fileURLToPath(import.meta.url))
const cfg = loadServidorEnv(resolve(lanDir, 'servidor.env'))
const { publicOrigin, supabasePublicUrl, lanHost, httpPort } = cfg

const anonPath = resolve(lanDir, '../../frontend/.env')
let ANON = process.env.VITE_SUPABASE_ANON_KEY
if (!ANON && existsSync(anonPath)) {
  const m = readFileSync(anonPath, 'utf8').match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)
  if (m) ANON = m[1].trim()
}
if (!ANON) {
  const { execSync } = await import('node:child_process')
  ANON = execSync('supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .find((l) => l.startsWith('ANON_KEY='))
    ?.replace(/^ANON_KEY="?|"$/g, '')
    ?.replace(/"$/, '')
}
if (!ANON) throw new Error('Não foi possível obter ANON_KEY (supabase status)')

const URL = supabasePublicUrl
const results = []
const ok = (n, d = '') => {
  results.push({ name: n, ok: true })
  console.log(`✅ ${n}${d ? ` — ${d}` : ''}`)
}
const fail = (n, e) => {
  const d = e instanceof Error ? e.message : String(e)
  results.push({ name: n, ok: false, detail: d })
  console.error(`❌ ${n} — ${d}`)
}

async function main() {
  console.log(`LAN host: ${lanHost}:${httpPort}`)
  console.log(`Origem pública: ${publicOrigin}`)
  console.log(`Supabase client URL: ${URL}`)

  // A/B — HTTP UI
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

  // REST via proxy
  try {
    const r = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON } })
    ok('REST via proxy LAN', `HTTP ${r.status}`)
  } catch (e) {
    fail('REST via proxy LAN', e)
  }

  // Edge Function
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
    ok('Gravação app_state', tenantId.slice(0, 8))
  } catch (e) {
    fail('Gravação app_state', e)
  }

  try {
    const { data, error } = await client.from('app_state').select('payload').eq('tenant_id', tenantId).maybeSingle()
    if (error) throw error
    if (!data?.payload?.clinicas?.length) throw new Error('leitura vazia')
    ok('Leitura app_state', `${data.payload.clinicas.length} clínica(s)`)
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
    let got = false
    const ch = client
      .channel(`lan-rt:${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_state', filter: `tenant_id=eq.${tenantId}` },
        () => {
          got = true
        },
      )
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('subscribe timeout')), 12000)
      ch.subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          clearTimeout(t)
          resolve()
        }
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          clearTimeout(t)
          reject(new Error(s))
        }
      })
    })
    await client.rpc('save_app_state_for_tenant', {
      p_tenant_id: tenantId,
      p_version: 'lan-2',
      p_payload: { clinicas: [{ id: 'cli-1', nome: 'RT', ativa: true }], pedidos: [] },
    })
    const deadline = Date.now() + 8000
    while (!got && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200))
    await client.removeChannel(ch)
    if (!got) throw new Error('sem evento realtime')
    ok('Realtime app_state', 'evento OK')
  } catch (e) {
    fail('Realtime app_state', e)
  }

  console.log('\n===== RESUMO =====')
  const passed = results.filter((r) => r.ok).length
  console.log(`${passed}/${results.length} OK`)
  console.log(`\nAbra em outro dispositivo na mesma rede:\n  ${publicOrigin}\n`)
  if (results.some((r) => !r.ok)) process.exitCode = 1
}

main()
