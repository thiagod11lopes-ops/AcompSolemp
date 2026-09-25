-- AcompSOLEMP — corrige RLS no cadastro de equipe (email_access)
-- Problema: upsert direto falha com
--   "new row violates row-level security policy (USING expression)"
-- quando o e-mail já existe (ON CONFLICT → UPDATE) ou current_tenant_id()
-- não coincide com o tenant do gestor.
-- Solução: RPC security definer + policies alinhadas ao dono do tenant.

-- Policies: permitir dono do tenant (mesmo padrão de app_state)
drop policy if exists "email_access_select" on public.email_access;
drop policy if exists "email_access_insert_tenant" on public.email_access;
drop policy if exists "email_access_update_tenant" on public.email_access;
drop policy if exists "email_access_delete_tenant" on public.email_access;

create policy "email_access_select"
  on public.email_access for select
  using (
    tenant_id = public.current_tenant_id()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  );

create policy "email_access_insert_tenant"
  on public.email_access for insert
  with check (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  );

create policy "email_access_update_tenant"
  on public.email_access for update
  using (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  );

create policy "email_access_delete_tenant"
  on public.email_access for delete
  using (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = email_access.tenant_id and t.owner_user_id = auth.uid()
    )
  );

-- Upsert via RPC (bypassa RLS com validação explícita de ownership)
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
  v_existing_tenant uuid;
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

  if not exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.owner_user_id = v_uid
  )
  and public.current_tenant_id() is distinct from p_tenant_id then
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

-- Delete via RPC (mesmo critério)
create or replace function public.remove_email_access_for_tenant(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_tenant uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select e.tenant_id into v_tenant
  from public.email_access e
  where lower(e.email) = v_email;

  if v_tenant is null then
    return;
  end if;

  if not exists (
    select 1 from public.tenants t
    where t.id = v_tenant and t.owner_user_id = v_uid
  )
  and public.current_tenant_id() is distinct from v_tenant then
    raise exception 'Sem permissão para remover este e-mail';
  end if;

  delete from public.email_access where lower(email) = v_email;
end;
$$;

grant execute on function public.remove_email_access_for_tenant(text) to authenticated;
