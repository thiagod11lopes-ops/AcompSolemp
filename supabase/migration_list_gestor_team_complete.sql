-- AcompSOLEMP — equipe do super-admin = somente e-mails com acesso ativo (email_access)
-- E-mails excluídos pelo gestor saem da lista, mas os dados no app_state permanecem.

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

    -- Somente e-mails com acesso liberado (Cadastros / email_access)
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
      select count(*)::bigint
      from public.email_access ea
      where ea.tenant_id = t.id
        and lower(trim(ea.email)) <> v_super
        and lower(trim(ea.email)) <> lower(t.owner_email)
        and nullif(trim(ea.email), '') is not null
    )
  from public.tenants t
  where lower(t.owner_email) <> v_super
  order by lower(t.owner_email);
end;
$$;

grant execute on function public.list_active_gestores() to authenticated;
