-- AcompOPMS — lookup_email_access devolve todos os setores (perfis[])
-- do usuário no app_state, não só o perfil principal de email_access.

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
