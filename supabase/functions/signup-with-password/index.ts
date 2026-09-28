/**
 * Cria conta Auth com senha sem enviar e-mail de confirmação.
 * Recuperação de senha continua usando auth.resetPasswordForEmail no frontend.
 *
 * Deploy:
 *   supabase functions deploy signup-with-password --no-verify-jwt
 *
 * Secrets automáticos no projeto: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MARINHA_DOMAIN = 'marinha.mil.br'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isMarinhaEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at <= 0) return false
  return trimmed.slice(at + 1) === MARINHA_DOMAIN
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json()) as { email?: string; password?: string }
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')

    if (!isMarinhaEmail(email)) {
      return json({ error: `Use um e-mail institucional @${MARINHA_DOMAIN}` }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'A senha deve ter pelo menos 6 caracteres' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRole) {
      return json({ error: 'Service role não configurada na Edge Function.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirma sem disparar e-mail
    })

    if (error) {
      const lower = (error.message || '').toLowerCase()
      if (lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
        return json({ error: 'already_registered', message: error.message }, 409)
      }
      return json({ error: error.message || 'Falha ao criar conta' }, 400)
    }

    return json({ ok: true, userId: data.user?.id ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return json({ error: message }, 500)
  }
})
