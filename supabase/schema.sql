-- AcompSolemp — schema inicial (Fase 1: snapshot AppData em JSONB)
-- Execute no SQL Editor do Supabase Dashboard (projeto novo).

-- Extensões
create extension if not exists "pgcrypto";

-- Organização (tenant)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  org_code text not null unique,
  owner_user_id uuid references auth.users (id) on delete set null,
  owner_email text not null,
  created_at timestamptz not null default now()
);

create index if not exists tenants_owner_user_id_idx on public.tenants (owner_user_id);
create index if not exists tenants_org_code_idx on public.tenants (org_code);

-- Snapshot completo do AppData (mesmo modelo do IndexedDB / antigo Firestore)
create table if not exists public.app_state (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  version text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Perfil do usuário autenticado → tenant + id interno do AppData
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  app_user_id text not null,
  email text not null,
  perfil text not null default 'GESTOR',
  created_at timestamptz not null default now()
);

create index if not exists profiles_tenant_id_idx on public.profiles (tenant_id);
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Acesso Timeline por e-mail (usuários cadastrados pelo gestor)
create table if not exists public.email_access (
  email text primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  app_user_id text not null,
  perfil text not null,
  clinica_id text,
  nome text,
  created_at timestamptz not null default now()
);

create index if not exists email_access_tenant_id_idx on public.email_access (tenant_id);

-- RLS
alter table public.tenants enable row level security;
alter table public.app_state enable row level security;
alter table public.profiles enable row level security;
alter table public.email_access enable row level security;

-- Helpers
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- tenants: dono lê/atualiza; insert no bootstrap do gestor
create policy "tenants_select_own"
  on public.tenants for select
  using (id = public.current_tenant_id() or owner_user_id = auth.uid());

create policy "tenants_insert_authenticated"
  on public.tenants for insert
  with check (auth.uid() is not null and owner_user_id = auth.uid());

create policy "tenants_update_own"
  on public.tenants for update
  using (owner_user_id = auth.uid());

-- app_state: somente do próprio tenant
create policy "app_state_select_own"
  on public.app_state for select
  using (tenant_id = public.current_tenant_id());

create policy "app_state_insert_own"
  on public.app_state for insert
  with check (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = app_state.tenant_id and t.owner_user_id = auth.uid()
    )
  );

create policy "app_state_update_own"
  on public.app_state for update
  using (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = app_state.tenant_id and t.owner_user_id = auth.uid()
    )
  );

-- profiles: próprio usuário
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid() or tenant_id = public.current_tenant_id());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- email_access: membros do tenant (gestor cadastra; timeline consulta o próprio e-mail)
create policy "email_access_select"
  on public.email_access for select
  using (
    tenant_id = public.current_tenant_id()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "email_access_insert_tenant"
  on public.email_access for insert
  with check (tenant_id = public.current_tenant_id());

create policy "email_access_update_tenant"
  on public.email_access for update
  using (tenant_id = public.current_tenant_id());

create policy "email_access_delete_tenant"
  on public.email_access for delete
  using (tenant_id = public.current_tenant_id());

-- Lookup público (security definer) para o portão da Timeline antes da sessão
create or replace function public.lookup_email_access(p_email text)
returns table (
  email text,
  tenant_id uuid,
  app_user_id text,
  perfil text,
  clinica_id text,
  nome text
)
language sql
security definer
set search_path = public
as $$
  select
    e.email,
    e.tenant_id,
    e.app_user_id,
    e.perfil,
    e.clinica_id,
    e.nome
  from public.email_access e
  where lower(e.email) = lower(trim(p_email))
  limit 1
$$;

grant execute on function public.lookup_email_access(text) to anon, authenticated;