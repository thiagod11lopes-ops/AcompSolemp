-- AcompSOLEMP — personificação (super-admin entra como outro e-mail)
-- Requer is_super_admin() já existente.

create or replace function public.admin_resolve_impersonation(p_email text)
returns table (
  target_email text,
  tenant_id uuid,
  org_code text,
  owner_email text,
  perfil text,
  app_user_id text,
  nome text,
  is_gestor boolean,
  app_version text,
  app_payload jsonb
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

  -- Gestor (dono da organização)
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
    -- Equipe liberada em Cadastros
    select e.tenant_id, e.perfil, e.app_user_id, coalesce(e.nome, ''), lower(t.owner_email), t.org_code
      into v_tenant, v_perfil, v_app_user, v_nome, v_owner, v_org
    from public.email_access e
    join public.tenants t on t.id = e.tenant_id
    where lower(e.email) = v_email
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

  return query
  select
    v_email,
    v_tenant,
    v_org,
    v_owner,
    v_perfil,
    v_app_user,
    v_nome,
    v_is_gestor,
    coalesce(v_version, 'v16'),
    v_payload;
end;
$$;

grant execute on function public.admin_resolve_impersonation(text) to authenticated;

create or replace function public.admin_get_app_state(p_tenant_id uuid)
returns table (
  version text,
  payload jsonb,
  updated_at timestamptz
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
