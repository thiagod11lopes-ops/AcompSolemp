-- Fase 4 — pedido_historico (eventos da timeline).
-- Execute no SQL Editor (idempotente).

create table if not exists public.pedido_historico (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists pedido_historico_tenant_pedido_idx
  on public.pedido_historico (tenant_id, ((data->>'pedidoId')));

alter table public.pedido_historico enable row level security;

drop policy if exists "pedido_historico_select_tenant" on public.pedido_historico;
drop policy if exists "pedido_historico_write_tenant" on public.pedido_historico;
drop policy if exists "pedido_historico_update_tenant" on public.pedido_historico;
drop policy if exists "pedido_historico_delete_tenant" on public.pedido_historico;

create policy "pedido_historico_select_tenant"
  on public.pedido_historico for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.can_write_app_state(tenant_id));
create policy "pedido_historico_write_tenant"
  on public.pedido_historico for insert to authenticated
  with check (public.can_write_app_state(tenant_id));
create policy "pedido_historico_update_tenant"
  on public.pedido_historico for update to authenticated
  using (public.can_write_app_state(tenant_id))
  with check (public.can_write_app_state(tenant_id));
create policy "pedido_historico_delete_tenant"
  on public.pedido_historico for delete to authenticated
  using (public.can_write_app_state(tenant_id));

insert into public.pedido_historico (tenant_id, id, data, updated_at)
select
  s.tenant_id,
  elem->>'id',
  elem,
  now()
from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'historico', '[]'::jsonb)) elem
where nullif(elem->>'id', '') is not null
on conflict (tenant_id, id) do update
  set data = excluded.data,
      updated_at = now();
