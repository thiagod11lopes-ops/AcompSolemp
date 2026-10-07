-- AcompSOLEMP — ao recusar convite / remover e-mail da equipe:
-- 1) remove email_access
-- 2) desativa o usuário no app_state (blob)
-- 3) desativa também na tabela normalizada public.usuarios
-- Assim o e-mail só volta à equipe com novo cadastro do gestor;
-- sem cadastro, o login cria Portal do Gestor próprio.

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

  -- Soft-delete na tabela normalizada (quando existir).
  if to_regclass('public.usuarios') is not null then
    update public.usuarios u
    set
      data = (u.data - 'email') || jsonb_build_object('ativo', false),
      updated_at = now()
    where u.tenant_id = v_tenant
      and (
        (v_app_user is not null and u.id = v_app_user)
        or lower(coalesce(u.data->>'email', '')) = v_email
      );
  end if;

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
