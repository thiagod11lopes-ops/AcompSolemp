# Supabase — AcompSolemp (Fase 1)

Persistência remota do `AppData` em JSONB + Auth e-mail/senha.

## 1. Criar projeto

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → anote a região (ex.: South America)
3. Em **Project Settings → API**, copie:
   - Project URL
   - anon public key

## 2. Schema

No **SQL Editor**, execute o arquivo [`schema.sql`](./schema.sql).

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

## 6. GitHub Pages

Secrets sugeridos:

- `VITE_DATA_SOURCE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
