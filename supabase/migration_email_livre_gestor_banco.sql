-- AcompSOLEMP — e-mail livre vira gestor com banco próprio
-- Regra: se o e-mail NÃO está em email_access (não foi cadastrado/aceito
-- na equipe de outro gestor), o usuário autenticado pode (re)iniciar como
-- GESTOR com tenant próprio e gravar app_state / cadastrar equipe.
--
-- Também remove perfil de equipe órfão (email_access já sumiu) que impedia
-- o Cadastrar-se/Entrar de criar Portal do Gestor.

create or replace function public.clear_orphan_team_profile_for_gestor()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_perfil text;
  v_has_access boolean := false;
begin
  if v_uid is null then
    return false;
  end if;

  if v_email <> '' then
    select exists (
      select 1 from public.email_access e where lower(e.email) = v_email
    ) into v_has_access;
  end if;

  -- Ainda vinculado a uma equipe: não limpa (deve usar Timeline).
  if v_has_access then
    return false;
  end if;

  select upper(coalesce(p.perfil, ''))
    into v_perfil
  from public.profiles p
  where p.id = v_uid;

  if v_perfil is null then
    return false;
  end if;

  -- Já é gestor/admin: mantém.
  if v_perfil in ('GESTOR', 'ADMINISTRADOR') then
    return false;
  end if;

  -- Perfil de equipe sem email_access → órfão: libera para novo tenant de gestor.
  delete from public.profiles where id = v_uid;
  return true;
end;
$$;

grant execute on function public.clear_orphan_team_profile_for_gestor()
  to authenticated, service_role;

-- Escrita de app_state: também reconhece dono por e-mail do profile (JWT).
create or replace function public.can_write_app_state(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_tenant_id is not null
    and (
      p_tenant_id = public.current_tenant_id()
      or exists (
        select 1
        from public.tenants t
        where t.id = p_tenant_id
          and (
            t.owner_user_id = auth.uid()
            or lower(coalesce(t.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.tenant_id = p_tenant_id
          and upper(coalesce(p.perfil, '')) in ('GESTOR', 'ADMINISTRADOR')
      )
      or exists (
        select 1
        from public.profiles p
        where p.tenant_id = p_tenant_id
          and upper(coalesce(p.perfil, '')) in ('GESTOR', 'ADMINISTRADOR')
          and lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and coalesce(auth.jwt() ->> 'email', '') <> ''
      )
    );
$$;

grant execute on function public.can_write_app_state(uuid) to authenticated, anon, service_role;

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (id = auth.uid());
