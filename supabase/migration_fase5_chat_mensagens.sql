-- Fase 5 — chat_mensagens.
create table if not exists public.chat_mensagens (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists chat_mensagens_tenant_thread_idx
  on public.chat_mensagens (tenant_id, ((data->>'threadId')), ((data->>'data')));

alter table public.chat_mensagens enable row level security;

drop policy if exists "chat_mensagens_select_tenant" on public.chat_mensagens;
drop policy if exists "chat_mensagens_write_tenant" on public.chat_mensagens;
drop policy if exists "chat_mensagens_update_tenant" on public.chat_mensagens;
drop policy if exists "chat_mensagens_delete_tenant" on public.chat_mensagens;

create policy "chat_mensagens_select_tenant"
  on public.chat_mensagens for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.can_write_app_state(tenant_id));
create policy "chat_mensagens_write_tenant"
  on public.chat_mensagens for insert to authenticated
  with check (public.can_write_app_state(tenant_id));
create policy "chat_mensagens_update_tenant"
  on public.chat_mensagens for update to authenticated
  using (public.can_write_app_state(tenant_id))
  with check (public.can_write_app_state(tenant_id));
create policy "chat_mensagens_delete_tenant"
  on public.chat_mensagens for delete to authenticated
  using (public.can_write_app_state(tenant_id));

insert into public.chat_mensagens (tenant_id, id, data, updated_at)
select s.tenant_id, elem->>'id', elem, now()
from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'chatMensagens', '[]'::jsonb)) elem
where nullif(elem->>'id', '') is not null
on conflict (tenant_id, id) do update
  set data = excluded.data, updated_at = now();
