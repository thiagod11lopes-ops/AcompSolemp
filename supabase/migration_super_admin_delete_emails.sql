-- Super-admin: excluir gestor (tenant completo) ou e-mail de equipe.
-- E-mail autorizado: lopes.thiago.oliveira@marinha.mil.br
-- Execute no SQL Editor (idempotente).

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'lopes.thiago.oliveira@marinha.mil.br'
$$;

grant execute on function public.is_super_admin() to authenticated;

-- Remove um e-mail da equipe de um gestor (não remove o próprio gestor).
create or replace function public.admin_delete_team_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_super text := 'lopes.thiago.oliveira@marinha.mil.br';
  v_tenant uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Acesso restrito ao super administrador';
  end if;

  if v_email = '' or v_email = v_super then
    raise exception 'Não é permitido excluir este e-mail';
  end if;

  -- Não permitir apagar o owner do tenant por este caminho.
  if exists (
    select 1 from public.tenants t where lower(t.owner_email) = v_email
  ) then
    raise exception 'Para excluir o gestor use a exclusão da organização';
  end if;

  select e.tenant_id into v_tenant
  from public.email_access e
  where lower(e.email) = v_email
  limit 1;

  delete from public.email_access where lower(email) = v_email;
  delete from public.profiles where lower(email) = v_email;
  delete from public.account_pauses where lower(email) = v_email;
  delete from auth.users where lower(email) = v_email;

  return true;
end;
$$;

grant execute on function public.admin_delete_team_email(text) to authenticated;

-- Exclui o gestor e todo o banco da organização (tenant + equipe + auth).
create or replace function public.admin_delete_gestor_tenant(p_gestor_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_gestor text := lower(trim(p_gestor_email));
  v_super text := 'lopes.thiago.oliveira@marinha.mil.br';
  v_tenant uuid;
  r record;
begin
  if not public.is_super_admin() then
    raise exception 'Acesso restrito ao super administrador';
  end if;

  if v_gestor = '' or v_gestor = v_super then
    raise exception 'Não é permitido excluir o super administrador';
  end if;

  select t.id into v_tenant
  from public.tenants t
  where lower(t.owner_email) = v_gestor
  limit 1;

  if v_tenant is null then
    raise exception 'Gestor/organização não encontrado';
  end if;

  -- Auth users da equipe + gestor (exceto super-admin)
  for r in
    select lower(e.email) as email
    from public.email_access e
    where e.tenant_id = v_tenant
      and lower(e.email) <> v_super
    union
    select v_gestor
  loop
    delete from public.account_pauses where lower(email) = r.email;
    delete from auth.users where lower(email) = r.email;
  end loop;

  -- Cascata: email_access, profiles, app_state, tabelas normalizadas com FK
  delete from public.tenants where id = v_tenant;

  return true;
end;
$$;

grant execute on function public.admin_delete_gestor_tenant(text) to authenticated;
