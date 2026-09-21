-- AcompSOLEMP — personificação (super-admin entra como outro e-mail)
-- Corrige sombreamento de colunas OUT (perfil/tenant_id/email).

drop function if exists public.admin_resolve_impersonation(text);

create or replace function public.admin_resolve_impersonation(p_email text)
returns table (
  result_target_email text,
  result_tenant_id uuid,
  result_org_code text,
  result_owner_email text,
  result_perfil text,
  result_app_user_id text,
  result_nome text,
  result_is_gestor boolean,
  result_app_version text,
  result_app_payload jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_super text := 'lopes.thiago.oliveira@marinha.mil.br';
  v_tenant uuid;
  v_org text;
  v_owner text;
  v_perfil text;
  v_app_user text;
  v_nome text;
  v_is_gestor boolean := false;
  v_version text;
  v_payload jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Acesso restrito ao super administrador';
  end if;

  if v_email = v_super then
    raise exception 'Não é possível personificar o super administrador';
  end if;

  select t.id, t.org_code, lower(t.owner_email)
    into v_tenant, v_org, v_owner
  from public.tenants t
  where lower(t.owner_email) = v_email
  limit 1;

  if v_tenant is not null then
    v_is_gestor := true;
    v_perfil := 'GESTOR';
    v_app_user := 'user-owner-' || v_tenant::text;
    v_nome := split_part(v_email, '@', 1);
  else
    select ea.tenant_id,
           ea.perfil,
           ea.app_user_id,
           coalesce(ea.nome, ''),
           lower(t.owner_email),
           t.org_code
      into v_tenant, v_perfil, v_app_user, v_nome, v_owner, v_org
    from public.email_access ea
    join public.tenants t on t.id = ea.tenant_id
    where lower(ea.email) = v_email
    limit 1;

    if v_tenant is null then
      raise exception 'E-mail não encontrado no sistema';
    end if;
  end if;

  select s.version, s.payload
    into v_version, v_payload
  from public.app_state s
  where s.tenant_id = v_tenant;

  if v_payload is null then
    v_payload := jsonb_build_object('usuarios', '[]'::jsonb);
    v_version := 'v16';
  end if;

  -- Se o perfil vier vazio, tenta pegar do app_state.usuarios
  if nullif(trim(coalesce(v_perfil, '')), '') is null and v_payload ? 'usuarios' then
    select u.elem->>'perfil'
      into v_perfil
    from jsonb_array_elements(coalesce(v_payload->'usuarios', '[]'::jsonb)) as u(elem)
    where lower(trim(u.elem->>'email')) = v_email
    limit 1;
  end if;

  if nullif(trim(coalesce(v_perfil, '')), '') is null then
    v_perfil := 'CLINICA';
  end if;

  return query
  select
    v_email,
    v_tenant,
    v_org,
    v_owner,
    upper(trim(v_perfil)),
    coalesce(v_app_user, ''),
    coalesce(v_nome, ''),
    v_is_gestor,
    coalesce(v_version, 'v16'),
    v_payload;
end;
$$;

grant execute on function public.admin_resolve_impersonation(text) to authenticated;

drop function if exists public.admin_get_app_state(uuid);

create or replace function public.admin_get_app_state(p_tenant_id uuid)
returns table (
  result_version text,
  result_payload jsonb,
  result_updated_at timestamptz
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
  select s.version, s.payload, s.updated_at
  from public.app_state s
  where s.tenant_id = p_tenant_id;
end;
$$;

grant execute on function public.admin_get_app_state(uuid) to authenticated;

create or replace function public.admin_save_app_state(
  p_tenant_id uuid,
  p_version text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Acesso restrito ao super administrador';
  end if;

  insert into public.app_state (tenant_id, version, payload, updated_at)
  values (p_tenant_id, p_version, p_payload, now())
  on conflict (tenant_id) do update
    set version = excluded.version,
        payload = excluded.payload,
        updated_at = now();
end;
$$;

grant execute on function public.admin_save_app_state(uuid, text, jsonb) to authenticated;
