-- AcompSOLEMP — grava e devolve todos os setores (perfis[]) em email_access.
-- Corrige o modal "Fazer parte do sistema do gestor" que só mostrava o 1º setor.

alter table public.email_access
  add column if not exists perfis text[];

-- Preenche perfis a partir do app_state (quando já existirem) ou do perfil principal.
update public.email_access e
set perfis = coalesce(
  (
    select case
      when jsonb_typeof(u->'perfis') = 'array'
        and jsonb_array_length(u->'perfis') > 0
        then (
          select array_agg(trim(both from p) order by ord)
          from jsonb_array_elements_text(u->'perfis') with ordinality as arr(p, ord)
          where trim(both from p) <> ''
        )
      when coalesce(nullif(trim(both from u->>'perfil'), ''), '') <> ''
        then array[trim(both from u->>'perfil')]
      else null
    end
    from public.app_state s
    cross join lateral jsonb_array_elements(
      coalesce(s.payload->'usuarios', '[]'::jsonb)
    ) as u
    where s.tenant_id = e.tenant_id
      and (
        u->>'id' = e.app_user_id
        or lower(trim(both from coalesce(u->>'email', ''))) = lower(e.email)
      )
    order by case when u->>'id' = e.app_user_id then 0 else 1 end
    limit 1
  ),
  array[e.perfil]
)
where e.perfis is null
   or cardinality(e.perfis) = 0;

drop function if exists public.lookup_email_access(text);

create or replace function public.lookup_email_access(p_email text)
returns table (
  email text,
  tenant_id uuid,
  app_user_id text,
  perfil text,
  clinica_id text,
  nome text,
  gestor_email text,
  perfis text[]
)
language sql
security definer
set search_path = public
as $$
  select
    e.email,
    e.tenant_id,
    e.app_user_id,
    e.perfil,
    e.clinica_id,
    e.nome,
    t.owner_email as gestor_email,
    coalesce(
      nullif(e.perfis, '{}'::text[]),
      (
        select case
          when jsonb_typeof(u->'perfis') = 'array'
            and jsonb_array_length(u->'perfis') > 0
            then (
              select array_agg(trim(both from p) order by ord)
              from jsonb_array_elements_text(u->'perfis') with ordinality as arr(p, ord)
              where trim(both from p) <> ''
            )
          when coalesce(nullif(trim(both from u->>'perfil'), ''), '') <> ''
            then array[trim(both from u->>'perfil')]
          else null
        end
        from public.app_state s
        cross join lateral jsonb_array_elements(
          coalesce(s.payload->'usuarios', '[]'::jsonb)
        ) as u
        where s.tenant_id = e.tenant_id
          and (
            u->>'id' = e.app_user_id
            or lower(trim(both from coalesce(u->>'email', ''))) = lower(e.email)
          )
        order by case when u->>'id' = e.app_user_id then 0 else 1 end
        limit 1
      ),
      array[e.perfil]
    ) as perfis
  from public.email_access e
  join public.tenants t on t.id = e.tenant_id
  where lower(e.email) = lower(trim(p_email))
  limit 1
$$;

grant execute on function public.lookup_email_access(text) to anon, authenticated;

-- Nova assinatura com p_perfis (precisa DROP da sobrecarga antiga de 6 args).
drop function if exists public.upsert_email_access_for_tenant(text, uuid, text, text, text, text);

create or replace function public.upsert_email_access_for_tenant(
  p_email text,
  p_tenant_id uuid,
  p_app_user_id text,
  p_perfil text,
  p_clinica_id text default null,
  p_nome text default null,
  p_perfis text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_jwt_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_existing_tenant uuid;
  v_allowed boolean := false;
  v_perfis text[];
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if v_email is null or v_email = '' then
    raise exception 'E-mail inválido';
  end if;

  if p_tenant_id is null then
    raise exception 'Organização não encontrada';
  end if;

  select
    exists (
      select 1
      from public.tenants t
      where t.id = p_tenant_id
        and (
          t.owner_user_id = v_uid
          or (v_jwt_email <> '' and lower(t.owner_email) = v_jwt_email)
          or t.id = public.current_tenant_id()
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = v_uid
        and p.tenant_id = p_tenant_id
        and upper(coalesce(p.perfil, '')) in ('GESTOR', 'ADMINISTRADOR')
    )
  into v_allowed;

  if not v_allowed then
    raise exception 'Sem permissão para cadastrar nesta organização';
  end if;

  select e.tenant_id
    into v_existing_tenant
  from public.email_access e
  where lower(e.email) = v_email;

  if v_existing_tenant is not null
     and v_existing_tenant is distinct from p_tenant_id then
    if not (
      exists (
        select 1
        from public.tenants t
        where t.id = v_existing_tenant
          and (
            t.owner_user_id = v_uid
            or (v_jwt_email <> '' and lower(t.owner_email) = v_jwt_email)
            or t.id = public.current_tenant_id()
          )
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = v_uid
          and p.tenant_id = v_existing_tenant
      )
      or not exists (
        select 1
        from public.app_state s
        cross join lateral jsonb_array_elements(
          coalesce(s.payload->'usuarios', '[]'::jsonb)
        ) u
        where s.tenant_id = v_existing_tenant
          and lower(coalesce(u->>'email', '')) = v_email
          and coalesce((u->>'ativo')::boolean, false) = true
      )
    ) then
      raise exception 'Este e-mail já está vinculado a outra organização';
    end if;
  end if;

  select coalesce(
    (
      select array_agg(distinct trim(both from x))
      from unnest(coalesce(p_perfis, array[]::text[])) as x
      where trim(both from x) <> ''
    ),
    case
      when coalesce(nullif(trim(both from p_perfil), ''), '') <> ''
        then array[trim(both from p_perfil)]
      else null
    end
  )
  into v_perfis;

  insert into public.email_access (
    email,
    tenant_id,
    app_user_id,
    perfil,
    clinica_id,
    nome,
    perfis
  )
  values (
    v_email,
    p_tenant_id,
    p_app_user_id,
    p_perfil,
    nullif(trim(coalesce(p_clinica_id, '')), ''),
    nullif(trim(coalesce(p_nome, '')), ''),
    v_perfis
  )
  on conflict (email) do update
  set
    tenant_id = excluded.tenant_id,
    app_user_id = excluded.app_user_id,
    perfil = excluded.perfil,
    clinica_id = excluded.clinica_id,
    nome = excluded.nome,
    perfis = excluded.perfis;
end;
$$;

grant execute on function public.upsert_email_access_for_tenant(text, uuid, text, text, text, text, text[])
  to authenticated;
