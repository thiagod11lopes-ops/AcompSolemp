-- AcompSOLEMP — lista completa da equipe do gestor (email_access + usuarios no app_state)

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

  return query
  select
    q.email,
    q.perfil,
    q.nome,
    q.paused,
    q.is_gestor
  from (
    -- Gestor dono
    select
      v_gestor as email,
      'GESTOR'::text as perfil,
      'Gestor'::text as nome,
      exists (
        select 1 from public.account_pauses p where lower(p.email) = v_gestor
      ) as paused,
      true as is_gestor,
      0 as sort_rank

    union all

    -- E-mails liberados em Cadastros (email_access)
    select
      lower(e.email) as email,
      coalesce(nullif(trim(e.perfil), ''), 'USUARIO')::text as perfil,
      coalesce(e.nome, '') as nome,
      exists (
        select 1 from public.account_pauses p where lower(p.email) = lower(e.email)
      ) as paused,
      false as is_gestor,
      1 as sort_rank
    from public.email_access e
    where e.tenant_id = v_tenant
      and lower(e.email) <> v_super
      and lower(e.email) <> v_gestor
      and nullif(trim(e.email), '') is not null

    union all

    -- Usuários com e-mail no app_state (pode haver cadastros ainda não espelhados em email_access)
    select
      lower(trim(u.elem->>'email')) as email,
      coalesce(nullif(trim(u.elem->>'perfil'), ''), 'USUARIO')::text as perfil,
      coalesce(u.elem->>'nome', '') as nome,
      exists (
        select 1 from public.account_pauses p
        where lower(p.email) = lower(trim(u.elem->>'email'))
      ) as paused,
      false as is_gestor,
      1 as sort_rank
    from public.app_state s
    cross join lateral jsonb_array_elements(coalesce(s.payload->'usuarios', '[]'::jsonb)) as u(elem)
    where s.tenant_id = v_tenant
      and nullif(trim(u.elem->>'email'), '') is not null
      and lower(trim(u.elem->>'email')) <> v_super
      and lower(trim(u.elem->>'email')) <> v_gestor
      and coalesce((u.elem->>'ativo')::boolean, true) = true
      and not exists (
        select 1
        from public.email_access e2
        where e2.tenant_id = v_tenant
          and lower(e2.email) = lower(trim(u.elem->>'email'))
      )
  ) q
  order by q.sort_rank, q.email;
end;
$$;

grant execute on function public.list_gestor_team_emails(text) to authenticated;

-- Contagem de equipe inclui email_access + usuarios com e-mail no app_state
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
declare
  v_super text := 'lopes.thiago.oliveira@marinha.mil.br';
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
      select count(distinct lower(x.email))::bigint
      from (
        select e.email
        from public.email_access e
        where e.tenant_id = t.id
          and lower(e.email) <> v_super
          and lower(e.email) <> lower(t.owner_email)

        union

        select trim(u.elem->>'email')
        from public.app_state s
        cross join lateral jsonb_array_elements(coalesce(s.payload->'usuarios', '[]'::jsonb)) as u(elem)
        where s.tenant_id = t.id
          and nullif(trim(u.elem->>'email'), '') is not null
          and lower(trim(u.elem->>'email')) <> v_super
          and lower(trim(u.elem->>'email')) <> lower(t.owner_email)
          and coalesce((u.elem->>'ativo')::boolean, true) = true
      ) x
    ) as team_count
  from public.tenants t
  where lower(t.owner_email) <> v_super
  order by lower(t.owner_email);
end;
$$;

grant execute on function public.list_active_gestores() to authenticated;
