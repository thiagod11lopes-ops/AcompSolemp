-- Fase 3 — Tabela anexos (metadados; arquivo no Storage).
-- Execute no SQL Editor (idempotente).

create table if not exists public.anexos (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  id text not null,
  pedido_id text,
  storage_path text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists anexos_tenant_pedido_idx
  on public.anexos (tenant_id, pedido_id);

alter table public.anexos enable row level security;

drop policy if exists "anexos_select_tenant" on public.anexos;
drop policy if exists "anexos_write_tenant" on public.anexos;
drop policy if exists "anexos_update_tenant" on public.anexos;
drop policy if exists "anexos_delete_tenant" on public.anexos;

create policy "anexos_select_tenant"
  on public.anexos for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.can_write_app_state(tenant_id));
create policy "anexos_write_tenant"
  on public.anexos for insert to authenticated
  with check (public.can_write_app_state(tenant_id));
create policy "anexos_update_tenant"
  on public.anexos for update to authenticated
  using (public.can_write_app_state(tenant_id))
  with check (public.can_write_app_state(tenant_id));
create policy "anexos_delete_tenant"
  on public.anexos for delete to authenticated
  using (public.can_write_app_state(tenant_id));

-- RPC genérico com whitelist de tabelas normalizadas (Fases 3+).
create or replace function public.sync_domain_rows_from_appdata(
  p_tenant_id uuid,
  p_table text,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  elem jsonb;
  v_id text;
  v_pedido text;
  v_path text;
  v_data jsonb;
begin
  if p_tenant_id is null or not public.can_write_app_state(p_tenant_id) then
    raise exception 'Sem permissão para sincronizar domínio';
  end if;

  if p_table not in (
    'anexos',
    'pedido_historico',
    'chat_mensagens',
    'reversoes',
    'notificacoes',
    'processos_arquivados',
    'clinicas',
    'empresas',
    'materiais',
    'usuarios',
    'workflow_etapas',
    'solemp',
    'notas_fiscais'
  ) then
    raise exception 'Tabela normalizada não permitida: %', p_table;
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    return;
  end if;

  for elem in select * from jsonb_array_elements(p_rows)
  loop
    v_id := coalesce(elem->>'id', elem->'data'->>'id');
    if nullif(v_id, '') is null then
      continue;
    end if;
    v_data := coalesce(elem->'data', elem);

    if p_table = 'anexos' then
      v_data := v_data - 'conteudoBase64';
      v_pedido := coalesce(elem->>'pedido_id', v_data->>'pedidoId');
      v_path := coalesce(elem->>'storage_path', v_data->>'storagePath');
      insert into public.anexos (tenant_id, id, pedido_id, storage_path, data, updated_at)
      values (p_tenant_id, v_id, v_pedido, v_path, v_data, now())
      on conflict (tenant_id, id) do update
        set pedido_id = excluded.pedido_id,
            storage_path = excluded.storage_path,
            data = excluded.data,
            updated_at = now();
    else
      -- Tabelas simples (tenant_id, id, data) — criadas nas fases seguintes.
      execute format(
        'insert into public.%I (tenant_id, id, data, updated_at)
         values ($1, $2, $3, now())
         on conflict (tenant_id, id) do update
           set data = excluded.data,
               updated_at = now()',
        p_table
      )
      using p_tenant_id, v_id, v_data;
    end if;
  end loop;
end;
$$;

grant execute on function public.sync_domain_rows_from_appdata(uuid, text, jsonb)
  to authenticated, service_role;

-- Migração one-shot: arquivos[] + planilhaAnexosPorPedido + anexos da planilha.
with raw as (
  select s.tenant_id, elem as data
  from public.app_state s
  cross join lateral jsonb_array_elements(coalesce(s.payload->'arquivos', '[]'::jsonb)) elem
  union all
  select s.tenant_id, elem as data
  from public.app_state s
  cross join lateral jsonb_each(coalesce(s.payload->'planilhaAnexosPorPedido', '{}'::jsonb)) e(key, arr)
  cross join lateral jsonb_array_elements(coalesce(arr, '[]'::jsonb)) elem
  union all
  select s.tenant_id, elem as data
  from public.app_state s
  cross join lateral jsonb_each(coalesce(s.payload->'pedidoPlanilhaEnvio', '{}'::jsonb)) e(key, state)
  cross join lateral jsonb_array_elements(coalesce(state->'anexos', '[]'::jsonb)) elem
)
insert into public.anexos (tenant_id, id, pedido_id, storage_path, data, updated_at)
select distinct on (tenant_id, data->>'id')
  tenant_id,
  data->>'id',
  data->>'pedidoId',
  nullif(data->>'storagePath', ''),
  (data - 'conteudoBase64'),
  now()
from raw
where nullif(data->>'id', '') is not null
order by tenant_id, data->>'id', (data ? 'storagePath') desc
on conflict (tenant_id, id) do update
  set pedido_id = excluded.pedido_id,
      storage_path = excluded.storage_path,
      data = excluded.data,
      updated_at = now();
