-- AcompSOLEMP — status do e-mail na tela de login (Emails Cadastrados).
-- Rode no SQL Editor do Supabase.
-- Retorna: 'team' (liberado pelo gestor), 'gestor' (dono de tenant) ou nenhuma linha.

create or replace function public.lookup_login_email_status(p_email text)
returns table (
  status text,
  gestor_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_gestor text;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return;
  end if;

  -- 1) E-mail liberado em Cadastros (equipe)
  select lower(t.owner_email)
    into v_gestor
  from public.email_access e
  join public.tenants t on t.id = e.tenant_id
  where lower(e.email) = v_email
  limit 1;

  if found then
    status := 'team';
    gestor_email := v_gestor;
    return next;
    return;
  end if;

  -- 2) Gestor com banco próprio (aparece na aba Emails Cadastrados)
  select lower(t.owner_email)
    into v_gestor
  from public.tenants t
  where lower(t.owner_email) = v_email
  limit 1;

  if found then
    status := 'gestor';
    gestor_email := v_gestor;
    return next;
  end if;

  return;
end;
$$;

grant execute on function public.lookup_login_email_status(text) to anon, authenticated;
