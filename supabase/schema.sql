-- AcompSolemp — schema inicial (Fase 1: snapshot AppData em JSONB)
-- Execute no SQL Editor do Supabase Dashboard (idempotente: pode rodar de novo).

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
create index if not exists profiles_email_lower_idx on public.profiles (lower(email));

-- Compatível com bancos que ainda tenham a coluna legado recovery_email
alter table public.profiles add column if not exists recovery_email text;

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

-- Recria policies (seguro em reexecução)
drop policy if exists "tenants_select_own" on public.tenants;
drop policy if exists "tenants_insert_authenticated" on public.tenants;
drop policy if exists "tenants_update_own" on public.tenants;
drop policy if exists "app_state_select_own" on public.app_state;
drop policy if exists "app_state_insert_own" on public.app_state;
drop policy if exists "app_state_update_own" on public.app_state;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "email_access_select" on public.email_access;
drop policy if exists "email_access_insert_tenant" on public.email_access;
drop policy if exists "email_access_update_tenant" on public.email_access;
drop policy if exists "email_access_delete_tenant" on public.email_access;

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
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  );

create policy "email_access_insert_tenant"
  on public.email_access for insert
  with check (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  );

create policy "email_access_update_tenant"
  on public.email_access for update
  using (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  );

create policy "email_access_delete_tenant"
  on public.email_access for delete
  using (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  );

-- Lookup público (security definer) para o portão da Timeline antes da sessão
drop function if exists public.lookup_email_access(text);
drop function if exists public.decline_team_email_invite(text);

create or replace function public.lookup_email_access(p_email text)
returns table (
  email text,
  tenant_id uuid,
  app_user_id text,
  perfil text,
  clinica_id text,
  nome text,
  gestor_email text
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
    e.nome,
    t.owner_email as gestor_email
  from public.email_access e
  join public.tenants t on t.id = e.tenant_id
  where lower(e.email) = lower(trim(p_email))
  limit 1
$$;

grant execute on function public.lookup_email_access(text) to anon, authenticated;

-- Usuário recusa convite de equipe (remove e-mail do Cadastros do gestor)
create or replace function public.decline_team_email_invite(p_email text)
returns table (
  removed boolean,
  gestor_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_tenant uuid;
  v_gestor text;
  v_app_user text;
  v_payload jsonb;
begin
  select e.tenant_id, t.owner_email, e.app_user_id
    into v_tenant, v_gestor, v_app_user
  from public.email_access e
  join public.tenants t on t.id = e.tenant_id
  where lower(e.email) = v_email
  limit 1;

  if v_tenant is null then
    return query select false, null::text;
    return;
  end if;

  delete from public.email_access where lower(email) = v_email;

  select payload into v_payload
  from public.app_state
  where tenant_id = v_tenant;

  if v_payload is not null and v_payload ? 'usuarios' then
    update public.app_state
    set
      payload = jsonb_set(
        payload,
        '{usuarios}',
        (
          select coalesce(jsonb_agg(
            case
              when lower(coalesce(u->>'email', '')) = v_email
                or (v_app_user is not null and u->>'id' = v_app_user)
              then u || jsonb_build_object('ativo', false, 'email', null)
              else u
            end
          ), '[]'::jsonb)
          from jsonb_array_elements(payload->'usuarios') u
        ),
        true
      ),
      updated_at = now()
    where tenant_id = v_tenant;
  end if;

  return query select true, v_gestor;
end;
$$;

grant execute on function public.decline_team_email_invite(text) to anon, authenticated;

-- Upsert/remoção de email_access pelo gestor (security definer — evita falha de RLS no ON CONFLICT)
create or replace function public.upsert_email_access_for_tenant(
  p_email text,
  p_tenant_id uuid,
  p_app_user_id text,
  p_perfil text,
  p_clinica_id text default null,
  p_nome text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_existing_tenant uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if v_email is null or v_email = '' then
    raise exception 'E-mail inválido';
  end if;

  if p_tenant_id is null then
    raise exception 'Organização não encontrada';
  end if;

  if not exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.owner_user_id = v_uid
  )
  and public.current_tenant_id() is distinct from p_tenant_id then
    raise exception 'Sem permissão para cadastrar nesta organização';
  end if;

  select e.tenant_id
    into v_existing_tenant
  from public.email_access e
  where lower(e.email) = v_email;

  if v_existing_tenant is not null
     and v_existing_tenant is distinct from p_tenant_id then
    raise exception 'Este e-mail já está vinculado a outra organização';
  end if;

  insert into public.email_access (
    email,
    tenant_id,
    app_user_id,
    perfil,
    clinica_id,
    nome
  )
  values (
    v_email,
    p_tenant_id,
    p_app_user_id,
    p_perfil,
    nullif(trim(coalesce(p_clinica_id, '')), ''),
    nullif(trim(coalesce(p_nome, '')), '')
  )
  on conflict (email) do update
  set
    tenant_id = excluded.tenant_id,
    app_user_id = excluded.app_user_id,
    perfil = excluded.perfil,
    clinica_id = excluded.clinica_id,
    nome = excluded.nome;
end;
$$;

grant execute on function public.upsert_email_access_for_tenant(text, uuid, text, text, text, text)
  to authenticated;

create or replace function public.remove_email_access_for_tenant(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_tenant uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select e.tenant_id into v_tenant
  from public.email_access e
  where lower(e.email) = v_email;

  if v_tenant is null then
    return;
  end if;

  if not exists (
    select 1 from public.tenants t
    where t.id = v_tenant and t.owner_user_id = v_uid
  )
  and public.current_tenant_id() is distinct from v_tenant then
    raise exception 'Sem permissão para remover este e-mail';
  end if;

  delete from public.email_access where lower(email) = v_email;
end;
$$;

grant execute on function public.remove_email_access_for_tenant(text) to authenticated;

-- Privileges for Data API (necessário quando "Automatically expose new tables" está desligado)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.tenants to authenticated;
grant select, insert, update, delete on table public.app_state to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.email_access to authenticated;
grant select on table public.tenants to anon;
grant select on table public.email_access to anon;
