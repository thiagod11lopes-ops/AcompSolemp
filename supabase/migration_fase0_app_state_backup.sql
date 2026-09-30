-- Fase 0 — Preparação da migração do monolito app_state
-- Execute no SQL Editor do Supabase (idempotente).
-- Cria tabela de backup e snapshot inicial por tenant.
-- NÃO altera o comportamento do app.

create table if not exists public.app_state_backup (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  version text not null,
  payload jsonb not null,
  source_updated_at timestamptz,
  backed_up_at timestamptz not null default now(),
  note text
);

create index if not exists app_state_backup_tenant_id_idx
  on public.app_state_backup (tenant_id);

create index if not exists app_state_backup_backed_up_at_idx
  on public.app_state_backup (backed_up_at desc);

alter table public.app_state_backup enable row level security;

drop policy if exists "app_state_backup_select_own" on public.app_state_backup;
create policy "app_state_backup_select_own"
on public.app_state_backup for select
to authenticated
using (tenant_id = public.current_tenant_id());

-- Snapshot one-shot: copia o estado atual de todos os tenants (seguro reexecutar —
-- apenas adiciona novas linhas de backup).
insert into public.app_state_backup (tenant_id, version, payload, source_updated_at, note)
select
  s.tenant_id,
  s.version,
  s.payload,
  s.updated_at,
  'fase0-baseline'
from public.app_state s;

-- Diagnóstico: tamanho aproximado do payload por tenant (rodar no Editor).
-- select
--   t.org_code,
--   s.tenant_id,
--   pg_column_size(s.payload) as payload_bytes,
--   round(pg_column_size(s.payload) / 1024.0, 1) as payload_kb,
--   s.updated_at
-- from public.app_state s
-- join public.tenants t on t.id = s.tenant_id
-- order by pg_column_size(s.payload) desc;
