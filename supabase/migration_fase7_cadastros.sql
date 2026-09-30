-- Fase 7 — cadastros: clinicas, empresas, materiais, usuarios.
create table if not exists public.clinicas (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create table if not exists public.empresas (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create table if not exists public.materiais (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create table if not exists public.usuarios (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

alter table public.clinicas enable row level security;
alter table public.empresas enable row level security;
alter table public.materiais enable row level security;
alter table public.usuarios enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clinicas','empresas','materiais','usuarios'] loop
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

insert into public.clinicas (tenant_id, id, data, updated_at)
select s.tenant_id, e->>'id', e, now() from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'clinicas','[]'::jsonb)) e
where nullif(e->>'id','') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();

insert into public.empresas (tenant_id, id, data, updated_at)
select s.tenant_id, e->>'id', e, now() from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'empresas','[]'::jsonb)) e
where nullif(e->>'id','') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();

insert into public.materiais (tenant_id, id, data, updated_at)
select s.tenant_id, e->>'id', e, now() from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'materiais','[]'::jsonb)) e
where nullif(e->>'id','') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();

insert into public.usuarios (tenant_id, id, data, updated_at)
select s.tenant_id, e->>'id', e, now() from public.app_state s
cross join lateral jsonb_array_elements(coalesce(s.payload->'usuarios','[]'::jsonb)) e
where nullif(e->>'id','') is not null
on conflict (tenant_id, id) do update set data = excluded.data, updated_at = now();
