-- Fase 8 — workflow_etapas, solemp, notas_fiscais.
create table if not exists public.workflow_etapas (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create table if not exists public.solemp (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create table if not exists public.notas_fiscais (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

alter table public.workflow_etapas enable row level security;
alter table public.solemp enable row level security;
alter table public.notas_fiscais enable row level security;

do $$
declare t text;
begin
  foreach t in array array['workflow_etapas','solemp','notas_fiscais'] loop
    execute format('drop policy if exists %I on public.%I', t||'_select_tenant', t);
    execute format('drop policy if exists %I on public.%I', t||'_write_tenant', t);
    execute format('drop policy if exists %I on public.%I', t||'_update_tenant', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete_tenant', t);
    execute format('create policy %I on public.%I for select to authenticated using (tenant_id = public.current_tenant_id() or public.can_write_app_state(tenant_id))', t||'_select_tenant', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_write_app_state(tenant_id))', t||'_write_tenant', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_write_app_state(tenant_id)) with check (public.can_write_app_state(tenant_id))', t||'_update_tenant', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_write_app_state(tenant_id))', t||'_delete_tenant', t);
  end loop;
end $$;

insert into public.workflow_etapas (tenant_id, id, data, updated_at)
select s.tenant_id, e->>'id', e, now() from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'workflowEtapas','[]'::jsonb)) e
where nullif(e->>'id','') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();

insert into public.solemp (tenant_id, id, data, updated_at)
select s.tenant_id, e->>'id', e, now() from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'solemp','[]'::jsonb)) e
where nullif(e->>'id','') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();

insert into public.notas_fiscais (tenant_id, id, data, updated_at)
select s.tenant_id, e->>'id', e, now() from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'notasFiscais','[]'::jsonb)) e
where nullif(e->>'id','') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();
