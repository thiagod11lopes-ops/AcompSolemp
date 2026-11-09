-- Planilhas da aba Enviar (rascunho CONMED/IMH por clínica) — tabela dedicada no servidor.
create table if not exists public.planilhas_livres (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  clinica_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, clinica_id)
);

create index if not exists planilhas_livres_tenant_updated_at_idx
  on public.planilhas_livres (tenant_id, updated_at desc);

alter table public.planilhas_livres enable row level security;

drop policy if exists planilhas_livres_select_tenant on public.planilhas_livres;
drop policy if exists planilhas_livres_write_tenant on public.planilhas_livres;
drop policy if exists planilhas_livres_update_tenant on public.planilhas_livres;
drop policy if exists planilhas_livres_delete_tenant on public.planilhas_livres;

create policy planilhas_livres_select_tenant on public.planilhas_livres
  for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.can_write_app_state(tenant_id));

create policy planilhas_livres_write_tenant on public.planilhas_livres
  for insert to authenticated
  with check (public.can_write_app_state(tenant_id));

create policy planilhas_livres_update_tenant on public.planilhas_livres
  for update to authenticated
  using (public.can_write_app_state(tenant_id))
  with check (public.can_write_app_state(tenant_id));

create policy planilhas_livres_delete_tenant on public.planilhas_livres
  for delete to authenticated
  using (public.can_write_app_state(tenant_id));

grant select, insert, update, delete on table public.planilhas_livres to authenticated;

-- Seed a partir do blob atual (quando houver conteúdo).
insert into public.planilhas_livres (tenant_id, clinica_id, data, updated_at)
select
  s.tenant_id,
  kv.key as clinica_id,
  kv.value as data,
  now()
from public.app_state s
cross join lateral jsonb_each(coalesce(s.payload->'planilhasLivres', '{}'::jsonb)) as kv(key, value)
where nullif(kv.key, '') is not null
on conflict (tenant_id, clinica_id) do update
set data = excluded.data, updated_at = now();
