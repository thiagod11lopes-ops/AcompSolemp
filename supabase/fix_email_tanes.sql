-- Liberação imediata do e-mail tanes@marinha.mil.br
-- Sintoma: login diz "não cadastrado" e cadastro diz que já está cadastrado.
-- Cole no SQL Editor do Supabase e execute.

-- 1) Remove o vínculo órfão em email_access
delete from public.email_access
where lower(email) = 'tanes@marinha.mil.br';

-- 2) Conferência (deve retornar 0 linhas)
select email, tenant_id, app_user_id, perfil, nome
from public.email_access
where lower(email) = 'tanes@marinha.mil.br';

-- Depois:
-- a) No app, o GESTOR cadastra de novo tanes@marinha.mil.br em Cadastros
-- b) Em seguida, tanes usa "Cadastrar-se" (primeiro acesso) ou "Entrar"
--    Se a senha antiga não funcionar: "Esqueci a senha"
