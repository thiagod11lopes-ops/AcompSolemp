-- AcompSOLEMP — corrige listagem da equipe (evita sombreamento de colunas OUT "email")
-- Execute no SQL Editor do Supabase.

drop function if exists public.list_gestor_team_emails(text);

create or replace function public.list_gestor_team_emails(p_gestor_email text)
returns table (
  result_email text,
  result_perfil text,
  result_nome text,
  result_paused boolean,
  result_is_gestor boolean
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

  return query
  select
    q.em,
    q.pf,
    q.nm,
    q.ps,
    q.ig
  from (
    -- Gestor dono
    select
      v_gestor as em,
      'GESTOR'::text as pf,
      'Gestor'::text as nm,
      exists (
        select 1
        from public.account_pauses ap
        where lower(ap.email) = v_gestor
      ) as ps,
      true as ig,
      0 as rk

    union all

    -- E-mails liberados em Cadastros (email_access)
    select
      lower(trim(ea.email)) as em,
      coalesce(nullif(trim(ea.perfil), ''), 'USUARIO')::text as pf,
      coalesce(ea.nome, '')::text as nm,
      exists (
        select 1
        from public.account_pauses ap
        where lower(ap.email) = lower(trim(ea.email))
      ) as ps,
      false as ig,
      1 as rk
    from public.email_access ea
    where ea.tenant_id = v_tenant
      and lower(trim(ea.email)) <> v_super
      and lower(trim(ea.email)) <> v_gestor
      and nullif(trim(ea.email), '') is not null

    union all

    -- Usuários com e-mail no app_state ainda não espelhados em email_access
    select
      lower(trim(elem.e->>'email')) as em,
      coalesce(nullif(trim(elem.e->>'perfil'), ''), 'USUARIO')::text as pf,
      coalesce(elem.e->>'nome', '')::text as nm,
      exists (
        select 1
        from public.account_pauses ap
        where lower(ap.email) = lower(trim(elem.e->>'email'))
      ) as ps,
      false as ig,
      1 as rk
    from public.app_state st
    cross join lateral jsonb_array_elements(coalesce(st.payload->'usuarios', '[]'::jsonb)) as elem(e)
    where st.tenant_id = v_tenant
      and nullif(trim(elem.e->>'email'), '') is not null
      and lower(trim(elem.e->>'email')) <> v_super
      and lower(trim(elem.e->>'email')) <> v_gestor
      and (
        elem.e->>'ativo' is null
        or lower(elem.e->>'ativo') in ('true', 't', '1')
      )
      and not exists (
        select 1
        from public.email_access ea2
        where ea2.tenant_id = v_tenant
          and lower(trim(ea2.email)) = lower(trim(elem.e->>'email'))
      )
  ) q
  order by q.rk, q.em;
end;
$$;

grant execute on function public.list_gestor_team_emails(text) to authenticated;

drop function if exists public.list_active_gestores();

create or replace function public.list_active_gestores()
returns table (
  result_email text,
  result_tenant_id uuid,
  result_org_code text,
  result_paused boolean,
  result_team_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_super text := 'lopes.thiago.oliveira@marinha.mil.br';
begin
  if not public.is_super_admin() then
    raise exception 'Acesso restrito ao super administrador';
  end if;

  return query
  select
    lower(t.owner_email),
    t.id,
    t.org_code,
    exists (
      select 1
      from public.account_pauses ap
      where lower(ap.email) = lower(t.owner_email)
    ),
    (
      select count(distinct lower(trim(x.em)))::bigint
      from (
        select ea.email as em
        from public.email_access ea
        where ea.tenant_id = t.id
          and lower(trim(ea.email)) <> v_super
          and lower(trim(ea.email)) <> lower(t.owner_email)

        union

        select trim(elem.e->>'email') as em
        from public.app_state st
        cross join lateral jsonb_array_elements(coalesce(st.payload->'usuarios', '[]'::jsonb)) as elem(e)
        where st.tenant_id = t.id
          and nullif(trim(elem.e->>'email'), '') is not null
          and lower(trim(elem.e->>'email')) <> v_super
          and lower(trim(elem.e->>'email')) <> lower(t.owner_email)
          and (
            elem.e->>'ativo' is null
            or lower(elem.e->>'ativo') in ('true', 't', '1')
          )
      ) x
    )
  from public.tenants t
  where lower(t.owner_email) <> v_super
  order by lower(t.owner_email);
end;
$$;

grant execute on function public.list_active_gestores() to authenticated;
