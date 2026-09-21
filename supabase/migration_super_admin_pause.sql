-- AcompSOLEMP — super-admin: listar gestores / equipes e pausar contas
-- E-mail autorizado: lopes.thiago.oliveira@marinha.mil.br

create table if not exists public.account_pauses (
  email text primary key,
  paused_by text not null,
  paused_at timestamptz not null default now()
);

alter table public.account_pauses enable row level security;

drop policy if exists "account_pauses_no_direct" on public.account_pauses;

-- Sem acesso direto via Data API; só via RPCs security definer
create policy "account_pauses_no_direct"
  on public.account_pauses for all
  using (false)
  with check (false);

grant select, insert, update, delete on table public.account_pauses to authenticated;
grant select on table public.account_pauses to anon;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'lopes.thiago.oliveira@marinha.mil.br'
$$;

create or replace function public.is_account_paused(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_pauses p
    where lower(p.email) = lower(trim(p_email))
  )
$$;

grant execute on function public.is_account_paused(text) to anon, authenticated;

create or replace function public.list_active_gestores()
returns table (
  email text,
  tenant_id uuid,
  org_code text,
  paused boolean,
  team_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Acesso restrito ao super administrador';
  end if;

  return query
  select
    lower(t.owner_email) as email,
    t.id as tenant_id,
    t.org_code,
    exists (
      select 1 from public.account_pauses p
      where lower(p.email) = lower(t.owner_email)
    ) as paused,
    (
      select count(*)::bigint
      from public.email_access e
      where e.tenant_id = t.id
        and lower(e.email) <> 'lopes.thiago.oliveira@marinha.mil.br'
    ) as team_count
  from public.tenants t
  where lower(t.owner_email) <> 'lopes.thiago.oliveira@marinha.mil.br'
  order by lower(t.owner_email);
end;
$$;

grant execute on function public.list_active_gestores() to authenticated;

create or replace function public.list_gestor_team_emails(p_gestor_email text)
returns table (
  email text,
  perfil text,
  nome text,
  paused boolean,
  is_gestor boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gestor text := lower(trim(p_gestor_email));
  v_tenant uuid;
  v_super text := 'lopes.thiago.oliveira@marinha.mil.br';
begin
  if not public.is_super_admin() then
    raise exception 'Acesso restrito ao super administrador';
  end if;

  select t.id into v_tenant
  from public.tenants t
  where lower(t.owner_email) = v_gestor
  limit 1;

  if v_tenant is null then
    return;
  end if;

  -- Gestor da organização + equipe (nunca o super-admin)
  return query
  select * from (
    select
      v_gestor as email,
      'GESTOR'::text as perfil,
      'Gestor'::text as nome,
      exists (
        select 1 from public.account_pauses p where lower(p.email) = v_gestor
      ) as paused,
      true as is_gestor
    where v_gestor <> v_super

    union all

    select
      lower(e.email) as email,
      e.perfil,
      coalesce(e.nome, '') as nome,
      exists (
        select 1 from public.account_pauses p where lower(p.email) = lower(e.email)
      ) as paused,
      false as is_gestor
    from public.email_access e
    where e.tenant_id = v_tenant
      and lower(e.email) <> v_super
  ) q
  order by q.is_gestor desc, q.email;
end;
$$;

grant execute on function public.list_gestor_team_emails(text) to authenticated;

create or replace function public.set_account_paused(p_email text, p_paused boolean)
returns table (
  result_email text,
  result_paused boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_actor text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if not public.is_super_admin() then
    raise exception 'Acesso restrito ao super administrador';
  end if;

  if v_email = 'lopes.thiago.oliveira@marinha.mil.br' then
    raise exception 'Não é permitido pausar o super administrador';
  end if;

  if p_paused then
    insert into public.account_pauses as ap (email, paused_by, paused_at)
    values (v_email, v_actor, now())
    on conflict (email) do update
      set paused_by = excluded.paused_by,
          paused_at = now();
  else
    delete from public.account_pauses as ap
    where lower(ap.email) = v_email;
  end if;

  return query
  select v_email, public.is_account_paused(v_email);
end;
$$;

grant execute on function public.set_account_paused(text, boolean) to authenticated;
