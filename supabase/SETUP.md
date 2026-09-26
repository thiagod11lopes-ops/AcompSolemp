# Supabase — AcompSolemp (Fase 1)

Persistência remota do `AppData` em JSONB + Auth e-mail/senha.

## 1. Criar projeto

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → anote a região (ex.: South America)
3. Em **Project Settings → API**, copie:
   - Project URL
   - anon public key

## 2. Schema (obrigatório antes do primeiro cadastro)

No Supabase → **SQL Editor** → **New query**:

1. Abra o arquivo [`schema.sql`](./schema.sql) do repositório
2. Cole o conteúdo inteiro no editor
3. Clique em **Run**

Sem isso, o cadastro autenticará mas falhará com *Invalid path specified in request URL*
(as tabelas `tenants`, `profiles`, `app_state`, `email_access` ainda não existem).

Se o projeto **já tinha** o schema aplicado e o cadastro de equipe falha com
*new row violates row-level security policy … email_access*, execute também no SQL Editor:
[`migration_email_access_upsert_rpc.sql`](./migration_email_access_upsert_rpc.sql).

Se o **Novo cadastro** falha com
*new row violates row-level security policy for table "app_state"*, execute:
[`migration_fix_app_state_rls_cadastro.sql`](./migration_fix_app_state_rls_cadastro.sql).

Se a exclusão de cadastro falha com *Sem permissão para remover este e-mail* (ou o card
ainda lista excluídos), execute:
[`migration_gestor_remove_email_access.sql`](./migration_gestor_remove_email_access.sql).

Se o cadastro falha com *Este e-mail já está vinculado a outra organização* e a lista
está vazia, execute:
[`migration_reclaim_orphan_email_access.sql`](./migration_reclaim_orphan_email_access.sql)
(e, se precisar liberar um e-mail na hora:
`delete from public.email_access where lower(email) = 'seuemail@marinha.mil.br';`).

Para anexos no envio de planilha (botão **Arquivo Anexado** na timeline), execute:
[`migration_planilha_anexos_storage.sql`](./migration_planilha_anexos_storage.sql)
(cria o bucket `planilha-anexos` no Storage).

## 3. Auth

Em **Authentication → Providers**:

- Ative **Email**
- Desative confirmação de e-mail em desenvolvimento, se quiser (Authentication → Providers → Email → Confirm email)

## 4. Variáveis (`frontend/.env`)

```env
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Reinicie o `npm run dev`.

Com `VITE_DATA_SOURCE=local` (padrão), o app continua só em IndexedDB.

## 5. Fluxo Fase 1

| Quem | Como |
|------|------|
| Gestor | Login/senha → cria conta Supabase Auth no 1º acesso (ou entra) e provisiona `tenants` + `app_state` |
| Timeline | E-mail cadastrado em Cadastros (`email_access`) + login Supabase quando vinculado |
| Demo | Sempre IndexedDB local |

# 6. GitHub Pages

Secrets obrigatórios no repositório (Settings → Secrets and variables → Actions):

- `VITE_DATA_SOURCE=supabase`
- `VITE_SUPABASE_URL=https://xxxx.supabase.co` (**URL pública do projeto**, não `http://127.0.0.1`)
- `VITE_SUPABASE_ANON_KEY=eyJ...`

Se o cadastro/login mostrar **Failed to fetch**, em geral a URL do Secret aponta para localhost,
o projeto Supabase está pausado, ou a anon key está errada. Após corrigir os Secrets, rode
**Actions → Deploy GitHub Pages → Run workflow** para gerar um build novo.

No painel Supabase → Authentication → URL Configuration, inclua o site Pages em Redirect URLs
(ex.: `https://<user>.github.io/AcompSolemp/redefinir-senha`).
