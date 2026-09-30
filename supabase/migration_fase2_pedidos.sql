-- Fase 2 — Tabelas pedidos + pedido_planilha_envio (dual-write com app_state).
-- Execute no SQL Editor do Supabase (idempotente).

create table if not exists public.pedidos (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists pedidos_tenant_updated_at_idx
  on public.pedidos (tenant_id, updated_at desc);

create table if not exists public.pedido_planilha_envio (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pedido_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, pedido_id)
);

create index if not exists pedido_planilha_envio_tenant_updated_at_idx
  on public.pedido_planilha_envio (tenant_id, updated_at desc);

alter table public.pedidos enable row level security;
alter table public.pedido_planilha_envio enable row level security;

drop policy if exists "pedidos_select_tenant" on public.pedidos;
drop policy if exists "pedidos_write_tenant" on public.pedidos;
drop policy if exists "pedidos_update_tenant" on public.pedidos;
drop policy if exists "pedidos_delete_tenant" on public.pedidos;

create policy "pedidos_select_tenant"
  on public.pedidos for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.can_write_app_state(tenant_id));

create policy "pedidos_write_tenant"
  on public.pedidos for insert to authenticated
  with check (public.can_write_app_state(tenant_id));

create policy "pedidos_update_tenant"
  on public.pedidos for update to authenticated
  using (public.can_write_app_state(tenant_id))
  with check (public.can_write_app_state(tenant_id));

create policy "pedidos_delete_tenant"
  on public.pedidos for delete to authenticated
  using (public.can_write_app_state(tenant_id));

drop policy if exists "pedido_planilha_envio_select_tenant" on public.pedido_planilha_envio;
drop policy if exists "pedido_planilha_envio_write_tenant" on public.pedido_planilha_envio;
drop policy if exists "pedido_planilha_envio_update_tenant" on public.pedido_planilha_envio;
drop policy if exists "pedido_planilha_envio_delete_tenant" on public.pedido_planilha_envio;

create policy "pedido_planilha_envio_select_tenant"
  on public.pedido_planilha_envio for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.can_write_app_state(tenant_id));

create policy "pedido_planilha_envio_write_tenant"
  on public.pedido_planilha_envio for insert to authenticated
  with check (public.can_write_app_state(tenant_id));

create policy "pedido_planilha_envio_update_tenant"
  on public.pedido_planilha_envio for update to authenticated
  using (public.can_write_app_state(tenant_id))
  with check (public.can_write_app_state(tenant_id));

create policy "pedido_planilha_envio_delete_tenant"
  on public.pedido_planilha_envio for delete to authenticated
  using (public.can_write_app_state(tenant_id));

-- Upsert em lote (security definer) a partir do AppData.
create or replace function public.sync_pedidos_from_appdata(
  p_tenant_id uuid,
  p_pedidos jsonb,
  p_planilha_envio jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  elem jsonb;
  key text;
  val jsonb;
begin
  if p_tenant_id is null or not public.can_write_app_state(p_tenant_id) then
    raise exception 'Sem permissão para sincronizar pedidos';
  end if;

  if jsonb_typeof(p_pedidos) = 'array' then
    for elem in select * from jsonb_array_elements(p_pedidos)
    loop
      if nullif(elem->>'id', '') is null then
        continue;
      end if;
      insert into public.pedidos (tenant_id, id, data, updated_at)
      values (p_tenant_id, elem->>'id', elem, now())
      on conflict (tenant_id, id) do update
        set data = excluded.data,
            updated_at = now();
    end loop;
  end if;

  if jsonb_typeof(p_planilha_envio) = 'object' then
    for key, val in select * from jsonb_each(p_planilha_envio)
    loop
      insert into public.pedido_planilha_envio (tenant_id, pedido_id, data, updated_at)
      values (p_tenant_id, key, val, now())
      on conflict (tenant_id, pedido_id) do update
        set data = excluded.data,
            updated_at = now();
    end loop;
  end if;
end;
$$;

grant execute on function public.sync_pedidos_from_appdata(uuid, jsonb, jsonb)
  to authenticated, service_role;

-- Migração one-shot a partir do monolito (direto, sem checagem de JWT).
insert into public.pedidos (tenant_id, id, data, updated_at)
select
  s.tenant_id,
  elem->>'id',
  elem,
  now()
from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'pedidos', '[]'::jsonb)) as elem
where nullif(elem->>'id', '') is not null
on conflict (tenant_id, id) do update
  set data = excluded.data,
      updated_at = now();

insert into public.pedido_planilha_envio (tenant_id, pedido_id, data, updated_at)
select
  s.tenant_id,
  key,
  val,
  now()
from public.app_state s
cross join lateral jsonb_each(coalesce(s.payload->'pedidoPlanilhaEnvio', '{}'::jsonb)) as e(key, val)
on conflict (tenant_id, pedido_id) do update
  set data = excluded.data,
      updated_at = now();

-- Realtime (opcional): habilitar na publicação supabase_realtime se ainda não estiver.
-- alter publication supabase_realtime add table public.pedidos;
-- alter publication supabase_realtime add table public.pedido_planilha_envio;
