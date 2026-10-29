-- Leitura confiável de planilhas_livres (security definer) — evita F5 vazio
-- quando o SELECT direto falha por RLS/sessão e o blob app_state está oco.

create or replace function public.fetch_planilhas_livres_for_tenant(p_tenant_id uuid)
returns table (clinica_id text, data jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tenant_id is null then
    return;
  end if;
  -- Mesmo critério do save_app_state: tenant da sessão ou quem pode gravar.
  if not (
    p_tenant_id = public.current_tenant_id()
    or public.can_write_app_state(p_tenant_id)
  ) then
    raise exception 'Sem permissão para ler planilhas do tenant';
  end if;

  return query
  select pl.clinica_id::text, pl.data
  from public.planilhas_livres pl
  where pl.tenant_id = p_tenant_id;
end;
$$;

grant execute on function public.fetch_planilhas_livres_for_tenant(uuid) to authenticated;
grant execute on function public.fetch_planilhas_livres_for_tenant(uuid) to service_role;

-- Repara blob app_state vazio a partir da tabela (uma vez).
update public.app_state s
set
  payload = jsonb_set(
    coalesce(s.payload, '{}'::jsonb),
    '{planilhasLivres}',
    coalesce(
      (
        select jsonb_object_agg(pl.clinica_id, pl.data)
        from public.planilhas_livres pl
        where pl.tenant_id = s.tenant_id
      ),
      coalesce(s.payload->'planilhasLivres', '{}'::jsonb)
    )
  ),
  updated_at = now()
where exists (
  select 1
  from public.planilhas_livres pl
  where pl.tenant_id = s.tenant_id
)
and (
  s.payload->'planilhasLivres' is null
  or s.payload->'planilhasLivres' = '{}'::jsonb
  or exists (
    select 1
    from public.planilhas_livres pl
    where pl.tenant_id = s.tenant_id
      and (
        s.payload->'planilhasLivres'->pl.clinica_id is null
        or coalesce(
          jsonb_array_length(
            s.payload->'planilhasLivres'->pl.clinica_id->'imh'->'linhas'
          ),
          0
        ) = 0
      )
      and coalesce(jsonb_array_length(pl.data->'imh'->'linhas'), 0) > 0
  )
);
