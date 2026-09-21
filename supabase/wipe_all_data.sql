-- AcompSOLEMP — ZERA CADASTROS, mantém só o super-admin
-- E-mail preservado: lopes.thiago.oliveira@marinha.mil.br
-- ATENÇÃO: irreversível. Apaga gestores, equipes, organizações e demais contas Auth.

-- 1) Dados da aplicação
truncate table
  public.email_access,
  public.profiles,
  public.app_state,
  public.tenants
restart identity cascade;

-- Pausas de conta (se a tabela existir)
do $$
begin
  if to_regclass('public.account_pauses') is not null then
    execute 'truncate table public.account_pauses restart identity cascade';
  end if;
end $$;

-- 2) Contas Auth: remove todas, exceto o super-admin
delete from auth.users
where lower(email) is distinct from 'lopes.thiago.oliveira@marinha.mil.br';

-- Conferência
select
  (select count(*) from public.tenants) as tenants,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.email_access) as email_access,
  (select count(*) from public.app_state) as app_state,
  (select count(*) from auth.users) as auth_users,
  (
    select coalesce(string_agg(email, ', ' order by email), '')
    from auth.users
  ) as auth_emails_restantes;
