#!/usr/bin/env bash
# Aplica schema + migrations + grants no Supabase local (Opção A do README).
# Pré-requisito: `supabase start` já rodando na raiz do repositório.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

run_sql() {
  local file="$1"
  echo "==> $(basename "$file")"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file" >/dev/null
}

echo "Usando: $DB_URL"

# 1) Schema base (tenants, app_state, profiles, email_access + RPCs)
run_sql "$ROOT/supabase/schema.sql"

# 2) Tabelas normalizadas (fases 0–8) e strip do blob (fase 9)
for f in \
  migration_fase0_app_state_backup.sql \
  migration_fase1_strip_anexo_base64.sql \
  migration_fase2_pedidos.sql \
  migration_fase3_anexos.sql \
  migration_fase4_pedido_historico.sql \
  migration_fase5_chat_mensagens.sql \
  migration_fase6_reversoes_notif_arquivados.sql \
  migration_fase7_cadastros.sql \
  migration_fase8_config_auxiliares.sql \
  migration_fase9_slim_app_state.sql
do
  run_sql "$ROOT/supabase/$f"
done

# 3) Storage de anexos
run_sql "$ROOT/supabase/migration_planilha_anexos_storage.sql"

# 4) RPCs / ajustes de Auth e acesso (versões mais recentes por cima do schema)
for f in \
  migration_email_access_upsert_rpc.sql \
  migration_fix_app_state_rls_cadastro.sql \
  migration_gestor_remove_email_access.sql \
  migration_reclaim_orphan_email_access.sql \
  migration_lookup_email_access_perfis.sql \
  migration_lookup_login_email_status.sql \
  migration_decline_team_invite.sql \
  migration_email_livre_gestor_banco.sql \
  migration_recovery_email.sql \
  migration_super_admin_pause.sql \
  migration_super_admin_impersonate.sql \
  migration_super_admin_delete_emails.sql \
  migration_list_gestor_team_complete.sql
do
  run_sql "$ROOT/supabase/$f"
done

# 5) Grants do núcleo + privilégios para tabelas/funções criadas nas migrations
run_sql "$ROOT/supabase/grants.sql"

psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- Tabelas normalizadas / admin: API precisa de GRANT além do RLS
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to postgres, service_role, authenticated;
grant select on all tables in schema public to anon;
grant all on all sequences in schema public to postgres, service_role, authenticated;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Realtime: sync ao vivo do AppData (useLiveAppDataSync)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    execute 'alter publication supabase_realtime add table public.app_state';
  end if;
end $$;

-- Payload completo nos eventos postgres_changes
alter table public.app_state replica identity full;
SQL

echo "OK: schema, migrations, grants e realtime (app_state) aplicados."
