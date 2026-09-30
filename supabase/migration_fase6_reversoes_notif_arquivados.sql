-- Fase 6 — reversoes, notificacoes, processos_arquivados.
-- Execute no SQL Editor (idempotente).

create table if not exists public.reversoes (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists public.notificacoes (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists public.processos_arquivados (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

alter table public.reversoes enable row level security;
alter table public.notificacoes enable row level security;
alter table public.processos_arquivados enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['reversoes', 'notificacoes', 'processos_arquivados']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_tenant', t);
    execute format('drop policy if exists %I on public.%I', t || '_write_tenant', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_tenant', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_tenant', t);

    execute format(
      'create policy %I on public.%I for select to authenticated
       using (tenant_id = public.current_tenant_id() or public.can_write_app_state(tenant_id))',
      t || '_select_tenant', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated
       with check (public.can_write_app_state(tenant_id))',
      t || '_write_tenant', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated
       using (public.can_write_app_state(tenant_id))
       with check (public.can_write_app_state(tenant_id))',
      t || '_update_tenant', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated
       using (public.can_write_app_state(tenant_id))',
      t || '_delete_tenant', t
    );
  end loop;
end $$;

insert into public.reversoes (tenant_id, id, data, updated_at)
select s.tenant_id, elem->>'id', elem, now()
from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'reversoes', '[]'::jsonb)) elem
where nullif(elem->>'id', '') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();

insert into public.notificacoes (tenant_id, id, data, updated_at)
select s.tenant_id, elem->>'id', elem, now()
from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'notificacoes', '[]'::jsonb)) elem
where nullif(elem->>'id', '') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();

insert into public.processos_arquivados (tenant_id, id, data, updated_at)
select s.tenant_id, elem->>'id', elem, now()
from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'processosArquivados', '[]'::jsonb)) elem
where nullif(elem->>'id', '') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();
