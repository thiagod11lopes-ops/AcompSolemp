-- AcompSOLEMP — ZERA TODOS OS CADASTROS (SQL Editor)
-- ATENÇÃO: irreversível. Apaga gestores, equipes, organizações e contas Auth.

-- 1) Dados da aplicação
truncate table
  public.email_access,
  public.profiles,
  public.app_state,
  public.tenants
restart identity cascade;

-- 2) Contas de autenticação (login / senha)
delete from auth.users;

-- Conferência (deve retornar 0 em todas)
select
  (select count(*) from public.tenants) as tenants,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.email_access) as email_access,
  (select count(*) from public.app_state) as app_state,
  (select count(*) from auth.users) as auth_users;
