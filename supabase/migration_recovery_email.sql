-- AcompSolemp — e-mail Gmail de recuperação (rode no SQL Editor se o projeto já existe)

alter table public.profiles
  add column if not exists recovery_email text;

create index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create index if not exists profiles_recovery_email_lower_idx
  on public.profiles (lower(recovery_email));

-- Resolve o e-mail Auth (Gmail) a partir do e-mail institucional Marinha
create or replace function public.lookup_auth_email_by_marinha(p_marinha text)
returns table (
  marinha_email text,
  auth_email text
)
language sql
security definer
set search_path = public
as $$
  select
    p.email,
    coalesce(nullif(trim(p.recovery_email), ''), p.email) as auth_email
  from public.profiles p
  where lower(p.email) = lower(trim(p_marinha))
  limit 1
$$;

grant execute on function public.lookup_auth_email_by_marinha(text) to anon, authenticated;
