-- AcompSolemp — remove recuperação via Gmail (rode no SQL Editor se o projeto já existe)
-- Contas Auth passam a usar somente o e-mail @marinha.mil.br.

drop function if exists public.lookup_auth_email_by_marinha(text);

-- Coluna legado (opcional). Pode manter; o app não usa mais.
-- alter table public.profiles drop column if exists recovery_email;
