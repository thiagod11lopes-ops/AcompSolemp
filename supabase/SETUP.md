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
