-- Gestor desde + transferencia de organizacao ao trocar o e-mail do gestor.
-- Idempotente.

alter table public.tenants
  add column if not exists gestor_since date;

update public.tenants
set gestor_since = (created_at at time zone 'America/Sao_Paulo')::date
where gestor_since is null;

comment on column public.tenants.gestor_since is
  'Data (America/Sao_Paulo) em que o gestor atual assumiu a organizacao.';

-- Transfere o tenant do gestor anterior para o novo e-mail (mesma organizacao / dados).
create or replace function public.transfer_gestor_tenant_ownership(
  p_previous_email text,
  p_new_email text
)
returns table (
  tenant_id uuid,
  org_code text,
  owner_email text,
  gestor_since date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev text := lower(trim(coalesce(p_previous_email, '')));
  v_new text := lower(trim(coalesce(p_new_email, '')));
  v_tenant uuid;
  v_org text;
  v_since date;
  v_new_user uuid;
  v_owner_app text;
begin
  if v_new is null or v_new = '' then
    raise exception 'Informe o e-mail do novo gestor.';
  end if;
  if v_new !~ '^[^\s@]+@marinha\.mil\.br$' then
    raise exception 'O e-mail do gestor deve ser @marinha.mil.br.';
  end if;

  if v_prev <> '' then
    select t.id into v_tenant
    from public.tenants t
    where lower(t.owner_email) = v_prev
    limit 1;
  end if;

  if v_tenant is null then
    select t.id into v_tenant
    from public.tenants t
    where nullif(trim(t.owner_email), '') is not null
    order by t.created_at nulls last
    limit 1;
  end if;

  if v_tenant is null then
    raise exception 'Nenhuma organizacao encontrada para transferir.';
  end if;

  if exists (
    select 1
    from public.tenants t
    where lower(t.owner_email) = v_new
      and t.id <> v_tenant
  ) then
    raise exception 'O novo e-mail ja e dono de outra organizacao.';
  end if;

  select u.id into v_new_user
  from auth.users u
  where lower(u.email) = v_new
  limit 1;

  v_since := (now() at time zone 'America/Sao_Paulo')::date;
  v_owner_app := 'user-owner-' || v_tenant::text;

  update public.tenants t
  set
    owner_email = v_new,
    owner_user_id = coalesce(v_new_user, t.owner_user_id),
    gestor_since = v_since
  where t.id = v_tenant;

  if v_new_user is not null then
    insert into public.profiles (id, tenant_id, app_user_id, email, perfil)
    values (v_new_user, v_tenant, v_owner_app, v_new, 'GESTOR')
    on conflict (id) do update
      set tenant_id = excluded.tenant_id,
          app_user_id = excluded.app_user_id,
          email = excluded.email,
          perfil = 'GESTOR';
  end if;

  -- Atualiza metadados no snapshot (se existir).
  update public.app_state a
  set
    payload = jsonb_set(
      case
        when a.payload ? 'tenantMeta' then
          jsonb_set(a.payload, '{tenantMeta,ownerEmail}', to_jsonb(v_new), true)
        else
          jsonb_set(
            coalesce(a.payload, '{}'::jsonb),
            '{tenantMeta}',
            jsonb_build_object('ownerEmail', v_new),
            true
          )
      end,
      '{usuarios}',
      coalesce(
        (
          select jsonb_agg(
            case
              when (elem->>'id') = v_owner_app
                or upper(coalesce(elem->>'perfil', '')) in ('GESTOR', 'ADMINISTRADOR')
              then jsonb_set(
                jsonb_set(elem, '{email}', to_jsonb(v_new), true),
                '{login}',
                to_jsonb('gestor'::text),
                true
              )
              else elem
            end
          )
          from jsonb_array_elements(coalesce(a.payload->'usuarios', '[]'::jsonb)) elem
        ),
        '[]'::jsonb
      ),
      true
    ),
    updated_at = now()
  where a.tenant_id = v_tenant;

  select t.org_code, t.gestor_since
  into v_org, v_since
  from public.tenants t
  where t.id = v_tenant;

  tenant_id := v_tenant;
  org_code := v_org;
  owner_email := v_new;
  gestor_since := v_since;
  return next;
end;
$$;

revoke all on function public.transfer_gestor_tenant_ownership(text, text) from public;
grant execute on function public.transfer_gestor_tenant_ownership(text, text) to service_role;
-- Dashboard usa psql como postgres (superuser) — ok.
grant execute on function public.transfer_gestor_tenant_ownership(text, text) to postgres;

-- No primeiro login apos transferencia: vincula o auth user ao tenant ja existente (owner_email).
create or replace function public.claim_gestor_tenant_for_current_user()
returns table (
  tenant_id uuid,
  org_code text,
  owner_email text,
  owner_user_id uuid,
  created_at timestamptz,
  gestor_since date,
  app_user_id text,
  perfil text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_tenant public.tenants%rowtype;
  v_app text;
begin
  if v_uid is null then
    raise exception 'Nao autenticado.';
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email is null or v_email = '' then
    raise exception 'E-mail do usuario autenticado nao encontrado.';
  end if;

  -- Ja tem perfil de gestor nesta org
  if exists (
    select 1 from public.profiles p
    where p.id = v_uid
      and upper(p.perfil) in ('GESTOR', 'ADMINISTRADOR')
  ) then
    return query
    select
      t.id,
      t.org_code,
      t.owner_email,
      t.owner_user_id,
      t.created_at,
      t.gestor_since,
      p.app_user_id,
      p.perfil
    from public.profiles p
    join public.tenants t on t.id = p.tenant_id
    where p.id = v_uid;
    return;
  end if;

  select t.* into v_tenant
  from public.tenants t
  where lower(t.owner_email) = v_email
  limit 1;

  if v_tenant.id is null then
    return;
  end if;

  v_app := 'user-owner-' || v_tenant.id::text;

  update public.tenants
  set owner_user_id = v_uid
  where id = v_tenant.id
    and (owner_user_id is null or owner_user_id <> v_uid);

  insert into public.profiles (id, tenant_id, app_user_id, email, perfil)
  values (v_uid, v_tenant.id, v_app, v_email, 'GESTOR')
  on conflict (id) do update
    set tenant_id = excluded.tenant_id,
        app_user_id = excluded.app_user_id,
        email = excluded.email,
        perfil = 'GESTOR';

  return query
  select
    v_tenant.id,
    v_tenant.org_code,
    v_email,
    v_uid,
    v_tenant.created_at,
    coalesce(
      (select t2.gestor_since from public.tenants t2 where t2.id = v_tenant.id),
      v_tenant.gestor_since
    ),
    v_app,
    'GESTOR'::text;
end;
$$;

revoke all on function public.claim_gestor_tenant_for_current_user() from public;
grant execute on function public.claim_gestor_tenant_for_current_user() to authenticated;
grant execute on function public.claim_gestor_tenant_for_current_user() to service_role;
