-- AcompSOLEMP — libera e-mail órfão e permite recadastro
-- Sintoma: lista de Cadastrados vazia, mas ao cadastrar aparece
--   "Este e-mail já está vinculado a outra organização"
-- Causa: exclusão soft-deleteou o usuário e falhou ao limpar email_access
--   (ou o e-mail ficou em outro tenant do mesmo gestor).
--
-- 1) Liberação imediata do e-mail informado (rode se precisar agora):
-- delete from public.email_access where lower(email) = 'tanes@marinha.mil.br';
--
-- 2) RPC upsert: permite realocar vínculo órfão / do mesmo gestor.

create or replace function public.upsert_email_access_for_tenant(
  p_email text,
  p_tenant_id uuid,
  p_app_user_id text,
  p_perfil text,
  p_clinica_id text default null,
  p_nome text default null
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

  insert into public.email_access (
    email,
    tenant_id,
    app_user_id,
    perfil,
    clinica_id,
    nome
  )
  values (
    v_email,
    p_tenant_id,
    p_app_user_id,
    p_perfil,
    nullif(trim(coalesce(p_clinica_id, '')), ''),
    nullif(trim(coalesce(p_nome, '')), '')
  )
  on conflict (email) do update
  set
    tenant_id = excluded.tenant_id,
    app_user_id = excluded.app_user_id,
    perfil = excluded.perfil,
    clinica_id = excluded.clinica_id,
    nome = excluded.nome;
end;
$$;

grant execute on function public.upsert_email_access_for_tenant(text, uuid, text, text, text, text)
  to authenticated;
