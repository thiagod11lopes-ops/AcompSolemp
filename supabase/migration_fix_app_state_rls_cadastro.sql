-- AcompSOLEMP — corrige RLS de app_state no "Novo cadastro"
-- Sintoma: new row violates row-level security policy for table "app_state"
-- Causa: upsert direto falha quando current_tenant_id() está nulo ou o gestor
--        não passa no WITH CHECK do INSERT.
-- Solução: helper can_write_app_state + RPC security definer save_app_state_for_tenant.

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
    );
$$;

grant execute on function public.can_write_app_state(uuid) to authenticated, anon, service_role;

drop policy if exists "app_state_select_own" on public.app_state;
drop policy if exists "app_state_insert_own" on public.app_state;
drop policy if exists "app_state_update_own" on public.app_state;

create policy "app_state_select_own"
  on public.app_state for select
  using (
    tenant_id = public.current_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = app_state.tenant_id
        and (
          t.owner_user_id = auth.uid()
          or lower(coalesce(t.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

create policy "app_state_insert_own"
  on public.app_state for insert
  with check (public.can_write_app_state(tenant_id));

create policy "app_state_update_own"
  on public.app_state for update
  using (public.can_write_app_state(tenant_id))
  with check (public.can_write_app_state(tenant_id));

create or replace function public.save_app_state_for_tenant(
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
  if p_tenant_id is null then
    raise exception 'Organização não encontrada';
  end if;

  if not public.can_write_app_state(p_tenant_id) then
    raise exception 'Sem permissão para salvar o estado da organização';
  end if;

  insert into public.app_state (tenant_id, version, payload, updated_at)
  values (p_tenant_id, coalesce(nullif(trim(p_version), ''), 'v1'), p_payload, now())
  on conflict (tenant_id) do update
  set
    version = excluded.version,
    payload = excluded.payload,
    updated_at = now();
end;
$$;

grant execute on function public.save_app_state_for_tenant(uuid, text, jsonb)
  to authenticated, service_role;
