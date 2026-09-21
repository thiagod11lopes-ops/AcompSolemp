-- AcompSolemp — convite de equipe: e-mail do gestor + recusa (SQL Editor)
-- DROP é necessário porque o retorno de lookup_email_access mudou (novo campo gestor_email).

drop function if exists public.lookup_email_access(text);
drop function if exists public.decline_team_email_invite(text);

-- Lookup inclui o e-mail do gestor (owner da organização)
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

-- Usuário recusa fazer parte da organização do gestor (remove do Cadastros / email_access)
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

  -- Desativa o usuário no snapshot AppData do gestor (se existir)
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
