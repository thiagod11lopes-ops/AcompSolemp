/**
 * Teste geral do AcompOPMS contra Supabase local (sem browser).
 * Cobre: Auth, tenants/profiles/app_state, leitura/gravação, Storage, Realtime, Edge Function.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Rode com node_modules do frontend resolvível (cwd=frontend ou symlink).
const candidates = [
  resolve(import.meta.dirname, '../frontend/.env'),
  resolve(import.meta.dirname, '../.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'frontend/.env'),
]
const envPath = candidates.find((p) => existsSync(p))
if (!envPath) throw new Error(`frontend/.env não encontrado. Tentou: ${candidates.join(', ')}`)
const envText = readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const results = []

function ok(name, detail = '') {
  results.push({ name, ok: true, detail })
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, err) {
  const detail = err instanceof Error ? err.message : String(err)
  results.push({ name, ok: false, detail })
  console.error(`❌ ${name} — ${detail}`)
}

async function main() {
  console.log(`URL: ${URL}`)
  console.log(`DATA_SOURCE: ${env.VITE_DATA_SOURCE}`)

  // 0) Frontend
  try {
    const r = await fetch('http://127.0.0.1:5173/')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    ok('Frontend Vite respondendo', `HTTP ${r.status}`)
  } catch (e) {
    fail('Frontend Vite respondendo', e)
  }

  // 1) API health / REST
  try {
    const r = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON } })
    if (!r.ok && r.status !== 200) throw new Error(`HTTP ${r.status}`)
    ok('Conexão REST Supabase local', `HTTP ${r.status}`)
  } catch (e) {
    fail('Conexão REST Supabase local', e)
  }

  // 2) Edge Function
  try {
    const email = `teste.edge.${Date.now()}@marinha.mil.br`
    const r = await fetch(`${URL}/functions/v1/signup-with-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ANON}`,
        apikey: ANON,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: 'senha123456' }),
    })
    const body = await r.json()
    if (!r.ok || !body.ok) throw new Error(JSON.stringify(body))
    ok('Edge Function signup-with-password', `userId=${body.userId}`)
  } catch (e) {
    fail('Edge Function signup-with-password', e)
  }

  const email = `gestor.teste.${Date.now()}@marinha.mil.br`
  const password = 'senha123456'
  const client = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 3) Auth signUp (fallback / confirm off)
  let userId = null
  try {
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('sem user')
    userId = data.user.id
    ok('Auth signUp', email)
  } catch (e) {
    fail('Auth signUp', e)
  }

  // 4) Auth signIn
  let session = null
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    session = data.session
    if (!session) throw new Error('sem session')
    ok('Auth signIn', `uid=${data.user.id.slice(0, 8)}…`)
  } catch (e) {
    fail('Auth signIn', e)
  }

  const authClient = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // Prefer setSession for RLS
  if (session) {
    await authClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  }

  // 5) Provision tenant + profile + app_state (fluxo gestor)
  let tenantId = null
  try {
    const orgCode = `ORG${Date.now().toString(36).toUpperCase()}`
    const { data: tenant, error: tErr } = await authClient
      .from('tenants')
      .insert({
        org_code: orgCode,
        owner_user_id: userId,
        owner_email: email,
      })
      .select('id')
      .single()
    if (tErr) throw tErr
    tenantId = tenant.id

    const { error: pErr } = await authClient.from('profiles').insert({
      id: userId,
      tenant_id: tenantId,
      app_user_id: `user-owner-${tenantId}`,
      email,
      perfil: 'GESTOR',
    })
    if (pErr) throw pErr

    const payload = {
      clinicas: [{ id: 'cli-1', nome: 'Clínica Teste', ativa: true }],
      empresas: [],
      materiais: [],
      usuarios: [{ id: `user-owner-${tenantId}`, nome: 'Gestor', email, perfil: 'GESTOR' }],
      pedidos: [],
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

    const { error: sErr } = await authClient.rpc('save_app_state_for_tenant', {
      p_tenant_id: tenantId,
      p_version: 'local-test-1',
      p_payload: payload,
    })
    if (sErr) {
      // fallback upsert
      const { error: uErr } = await authClient.from('app_state').upsert({
        tenant_id: tenantId,
        version: 'local-test-1',
        payload,
        updated_at: new Date().toISOString(),
      })
      if (uErr) throw uErr
    }
    ok('Gravação tenant/profile/app_state', `tenant=${tenantId.slice(0, 8)}…`)
  } catch (e) {
    fail('Gravação tenant/profile/app_state', e)
  }

  // 6) Leitura
  try {
    const { data, error } = await authClient
      .from('app_state')
      .select('version, payload, updated_at')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) throw error
    if (!data?.payload) throw new Error('payload vazio')
    const clinicas = data.payload.clinicas ?? data.payload?.clinicas
    const count = Array.isArray(data.payload.clinicas) ? data.payload.clinicas.length : 0
    ok('Leitura app_state', `version=${data.version}, clinicas=${count}`)
  } catch (e) {
    fail('Leitura app_state', e)
  }

  // 7) Dual-write pedidos (RPC)
  try {
    const pedidos = [
      {
        id: 'ped-1',
        clinicaId: 'cli-1',
        status: 'EM_ANDAMENTO',
        createdAt: new Date().toISOString(),
      },
    ]
    const { error } = await authClient.rpc('sync_pedidos_from_appdata', {
      p_tenant_id: tenantId,
      p_pedidos: pedidos,
      p_planilha_envio: {},
    })
    if (error) throw error
    const { data, error: rErr } = await authClient
      .from('pedidos')
      .select('id, data')
      .eq('tenant_id', tenantId)
    if (rErr) throw rErr
    if (!data?.length) throw new Error('pedidos vazio após sync')
    ok('Sync/leitura pedidos normalizados', `${data.length} linha(s)`)
  } catch (e) {
    fail('Sync/leitura pedidos normalizados', e)
  }

  // 8) Storage anexos
  try {
    const path = `${tenantId}/ped-1/anexo-1/teste.txt`
    const content = new Blob(['conteudo de teste local'], { type: 'text/plain' })
    const { error: upErr } = await authClient.storage.from('planilha-anexos').upload(path, content, {
      upsert: true,
      contentType: 'text/plain',
    })
    if (upErr) throw upErr
    const { data, error: dlErr } = await authClient.storage.from('planilha-anexos').download(path)
    if (dlErr) throw dlErr
    const text = await data.text()
    if (!text.includes('teste local')) throw new Error('conteúdo divergente')
    ok('Storage planilha-anexos upload/download', path)
  } catch (e) {
    fail('Storage planilha-anexos upload/download', e)
  }

  // 9) Realtime app_state
  try {
    let gotEvent = false
    const channel = authClient
      .channel(`test-app_state:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_state',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          gotEvent = true
        },
      )
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('subscribe timeout')), 10000)
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer)
          resolve()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer)
          reject(new Error(`subscribe ${status}`))
        }
      })
    })

    const { error } = await authClient.rpc('save_app_state_for_tenant', {
      p_tenant_id: tenantId,
      p_version: 'local-test-2',
      p_payload: {
        clinicas: [{ id: 'cli-1', nome: 'Clínica Realtime', ativa: true }],
        empresas: [],
        materiais: [],
        usuarios: [],
        pedidos: [],
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
      },
    })
    if (error) throw error

    const deadline = Date.now() + 8000
    while (!gotEvent && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200))
    }
    await authClient.removeChannel(channel)
    if (!gotEvent) throw new Error('nenhum evento postgres_changes recebido')
    ok('Realtime app_state', 'evento recebido após update')
  } catch (e) {
    fail('Realtime app_state', e)
  }

  // 10) Lookup RPC (operação típica do login timeline)
  try {
    const { data, error } = await authClient.rpc('lookup_login_email_status', {
      p_email: email,
    })
    if (error) throw error
    ok('RPC lookup_login_email_status', JSON.stringify(data)?.slice(0, 80) ?? 'ok')
  } catch (e) {
    fail('RPC lookup_login_email_status', e)
  }

  console.log('\n===== RESUMO =====')
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)
  console.log(`Passou: ${passed}/${results.length}`)
  if (failed.length) {
    console.log('Falhas:')
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
