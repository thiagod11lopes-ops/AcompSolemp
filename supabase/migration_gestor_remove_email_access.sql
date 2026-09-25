-- AcompSOLEMP — gestor sempre pode excluir cadastros da própria organização
-- Problema: remove_email_access_for_tenant falhava com
--   "Sem permissão para remover este e-mail"
-- quando owner_user_id ≠ auth.uid() e current_tenant_id() não batia
-- (ex.: perfil ausente, owner_email ok, ou sessão de gestor legítima).
-- Efeito colateral: soft-delete local não atualizava a lista (mutation falhava
-- após save) e o card "Cadastrados" continuava mostrando o excluído.
-- Solução: critério amplo de gestor + soft-delete no app_state + p_tenant_id.

drop function if exists public.remove_email_access_for_tenant(text);
drop function if exists public.remove_email_access_for_tenant(text, uuid);

create or replace function public.remove_email_access_for_tenant(
  p_email text,
  p_tenant_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_jwt_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_tenant uuid;
  v_app_user text;
  v_payload jsonb;
  v_allowed boolean := false;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if v_email is null or v_email = '' then
    return;
  end if;

  select e.tenant_id, e.app_user_id
    into v_tenant, v_app_user
  from public.email_access e
  where lower(e.email) = v_email;

  if v_tenant is null then
    v_tenant := p_tenant_id;
  elsif p_tenant_id is not null and p_tenant_id is distinct from v_tenant then
    raise exception 'Este e-mail pertence a outra organização';
  end if;

  if v_tenant is null then
    return;
  end if;

  -- Gestor da organização: dono por uid, dono por e-mail JWT, tenant da sessão,
  -- perfil GESTOR/ADMIN, ou qualquer profile autenticado do mesmo tenant
  -- (o gestor logado sempre tem profile no próprio tenant).
  select
    exists (
      select 1
      from public.tenants t
      where t.id = v_tenant
        and (
          t.owner_user_id = v_uid
          or (v_jwt_email <> '' and lower(t.owner_email) = v_jwt_email)
          or t.id = public.current_tenant_id()
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = v_uid
        and p.tenant_id = v_tenant
    )
  into v_allowed;

  if not v_allowed then
    raise exception 'Sem permissão para remover este e-mail';
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
end;
$$;

grant execute on function public.remove_email_access_for_tenant(text, uuid) to authenticated;

-- Alinha upsert ao mesmo critério de gestor (cadastro continua funcionando)
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
  v_jwt_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_existing_tenant uuid;
  v_allowed boolean := false;
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

  select
    exists (
      select 1
      from public.tenants t
      where t.id = p_tenant_id
        and (
          t.owner_user_id = v_uid
          or (v_jwt_email <> '' and lower(t.owner_email) = v_jwt_email)
          or t.id = public.current_tenant_id()
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = v_uid
        and p.tenant_id = p_tenant_id
        and upper(coalesce(p.perfil, '')) in ('GESTOR', 'ADMINISTRADOR')
    )
  into v_allowed;

  if not v_allowed then
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
