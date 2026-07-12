# Transferir o banco AcompSolemp para um servidor local

Guia passo a passo para copiar o banco **Supabase na nuvem** (projeto `lvfesspmljwqhdlkyars`) para um ambiente **local** (seu PC ou um servidor na rede).

---

## 1. O que precisa ser transferido

O AcompSolemp (Fase 1) usa:

| Parte | Onde fica na nuvem | Precisa migrar? |
|--------|--------------------|-----------------|
| Tabelas do app (`tenants`, `app_state`, `profiles`, `email_access`) | Schema `public` | **Sim** |
| Funções SQL (`current_tenant_id`, `lookup_email_access`) | Schema `public` | **Sim** |
| Políticas RLS e GRANTs | Schema `public` | **Sim** |
| Usuários e senhas de login | Schema `auth` (Supabase Auth) | **Sim**, se quiser manter as mesmas contas |
| Arquivos Storage | Storage (não usado hoje no app) | Não necessário agora |

O “miolo” dos dados do sistema (pedidos, usuários da timeline, planilhas etc.) está dentro de `app_state.payload` (JSONB).

Arquivos de referência no repositório:

- [`../supabase/schema.sql`](../supabase/schema.sql) — criação das tabelas/funções/RLS  
- [`../supabase/grants.sql`](../supabase/grants.sql) — permissões da API  

---

## 2. Escolha o tipo de servidor local

Há **duas** formas recomendadas. Prefira a **Opção A**.

### Opção A — Supabase local com Docker (recomendado)

Roda Postgres + Auth + API iguais aos da nuvem, no seu computador.

**Vantagens:** Auth e-mail/senha funciona igual; mesma URL/keys locais; menos surpresa.  
**Requisitos:** Docker Desktop instalado e rodando (Windows/Mac/Linux).

### Opção B — Só PostgreSQL (sem Auth Supabase)

Instala Postgres “puro” e importa as tabelas `public`.

**Vantagens:** mais leve.  
**Desvantagens:** o login atual do app depende do **Supabase Auth**; sem Auth, o frontend em modo `supabase` **não** autentica do mesmo jeito. Só faz sentido se você for adaptar o app depois.

> Para o AcompSolemp como está hoje, use a **Opção A**.

---

## 3. Preparação no Windows

1. Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Abra o Docker e espere ficar “Running”.
3. Instale o [Supabase CLI](https://supabase.com/docs/guides/cli) (no Windows, o instalador oficial ou `scoop install supabase` costuma funcionar melhor que `npx` em alguns PCs).
4. Instale o cliente `psql` / `pg_dump` (vem com [PostgreSQL](https://www.postgresql.org/download/windows/) ou use as ferramentas do próprio Docker).

Guarde da nuvem (Dashboard → **Project Settings**):

- **Project ref** (ex.: `lvfesspmljwqhdlkyars`)
- **Database password** (senha do Postgres criada no projeto)
- **Project URL** e **anon/publishable key** (só para comparar; no local serão outras)

---

## 4. Opção A — Passo a passo (Supabase local)

### 4.1. Iniciar Supabase no PC

Na pasta do projeto (raiz do repositório `AcompSolemp`):

```bash
supabase init
supabase start
```

Ao terminar, o CLI mostra algo como:

- API URL: `http://127.0.0.1:54321`
- anon key: `eyJ...` (ou chave publishable local)
- DB URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**Anote esses valores.** Eles substituem a URL/chave da nuvem no `.env` local.

### 4.2. Aplicar o schema do AcompSolemp no local

Ainda na raiz do projeto:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/schema.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/grants.sql
```

Se `psql` não estiver no PATH, use Docker:

```bash
docker exec -i supabase_db_<nome> psql -U postgres -d postgres < supabase/schema.sql
docker exec -i supabase_db_<nome> psql -U postgres -d postgres < supabase/grants.sql
```

(O nome do container aparece em `docker ps`.)

### 4.3. Exportar dados da nuvem (schema `public`)

No computador com acesso à internet, exporte **somente** as tabelas do app:

```bash
pg_dump "postgresql://postgres.[REF]:[SENHA_DO_BANCO]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres" ^
  --schema=public ^
  --data-only ^
  --no-owner ^
  --no-acl ^
  -t public.tenants ^
  -t public.app_state ^
  -t public.profiles ^
  -t public.email_access ^
  -f acompsolemp_public_data.sql
```

**Como montar a connection string da nuvem:**

1. Dashboard → **Project Settings → Database**
2. Em **Connection string**, escolha **URI**
3. Substitua `[YOUR-PASSWORD]` pela senha do banco
4. Prefira o modo **Session** ou **Transaction** pooler se a conexão direta (`db.xxx.supabase.co:5432`) falhar

Alternativa pelo Dashboard (sem `pg_dump`):

1. **SQL Editor** → rode consultas `COPY` / export CSV por tabela  
2. Ou use **Database → Backups** (plano pago) / ferramentas de dump do painel, se disponíveis

### 4.4. Importar os dados no Postgres local

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f acompsolemp_public_data.sql
```

Se der erro de chave estrangeira em `profiles` / `tenants` por falta de usuários em `auth.users`, vá para a seção **5** (Auth) **antes** de importar `profiles`, ou importe na ordem:

1. `tenants`  
2. usuários Auth (seção 5)  
3. `profiles`  
4. `app_state`  
5. `email_access`

### 4.5. Apontar o frontend para o Supabase local

Edite `frontend/.env` (não versionar no Git):

```env
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=[cole_a_anon_key_do_supabase_start]
```

Reinicie:

```bash
cd frontend
npm run dev
```

Abra `http://localhost:5173/` e teste o login.

### 4.6. Auth local (Site URL)

No Supabase local, configure redirects (Studio local costuma ser `http://127.0.0.1:54323`):

- Site URL: `http://localhost:5173/`
- Redirect URLs: `http://localhost:5173/**`

---

## 5. Migrar usuários do Auth (e-mail/senha)

As tabelas `profiles.owner_user_id` / `profiles.id` apontam para `auth.users`. Sem migrar Auth, os IDs não batem e o login antigo não encontra o perfil.

### 5.1. Exportar Auth da nuvem (avançado)

Dump do schema `auth` (cuidado: contém hashes de senha — trate como **segredo**):

```bash
pg_dump "postgresql://postgres.[REF]:[SENHA]@db.[REF].supabase.co:5432/postgres" ^
  --schema=auth ^
  --no-owner ^
  --no-acl ^
  -f acompsolemp_auth.sql
```

Importe no local **somente se souber o que está fazendo** (versões do GoTrue/Auth precisam ser compatíveis):

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f acompsolemp_auth.sql
```

### 5.2. Caminho mais simples (recomendado na prática)

1. Importe só `tenants` + `app_state` (+ `email_access` se quiser).  
2. No local, **crie de novo** o usuário gestor com o mesmo e-mail (tela de login).  
3. Ajuste manualmente o vínculo, se necessário:

```sql
-- Exemplo: após criar o usuário local, atualize o tenant/profile
-- (IDs reais vêm do Studio local → Authentication → Users)

update public.tenants
set owner_user_id = '<uuid_do_auth_users_local>',
    owner_email = 'seu@email.com'
where org_code = '<CODIGO_DA_ORG>';

-- Recrie o profile apontando para o app_user_id que está dentro do JSON em app_state
```

Se o `app_state.payload` já tiver o gestor com `id = user-owner-<tenant_id>`, mantenha o mesmo `tenant_id` da nuvem ao importar `tenants`/`app_state` e só reconecte o `auth.users` novo ao `profiles`.

---

## 6. Opção B — PostgreSQL puro (resumo)

1. Instale PostgreSQL 15+.  
2. Crie um banco `acompsolemp`.  
3. Rode `supabase/schema.sql` e `supabase/grants.sql` (os GRANTs para `anon`/`authenticated` só fazem sentido com roles do Supabase; em Postgres puro adapte para um usuário da aplicação).  
4. Importe o dump `public`.  
5. O frontend **em modo supabase** ainda precisará de Auth API — sem ela, use `VITE_DATA_SOURCE=local` (IndexedDB) ou implemente outra autenticação.

---

## 7. Servidor local na rede (outra máquina)

Se o “servidor local” for um PC/servidor na LAN (não o seu notebook de desenvolvimento):

1. Instale Docker + Supabase CLI **nessa máquina**.  
2. Rode `supabase start` (ou compose de produção auto-hospedado — ver [Self-Hosting Supabase](https://supabase.com/docs/guides/self-hosting)).  
3. Libere firewall nas portas da API (ex.: 54321) e do Studio, se for usar.  
4. No frontend / GitHub Pages, aponte:

```env
VITE_SUPABASE_URL=http://IP_DO_SERVIDOR:54321
VITE_SUPABASE_ANON_KEY=...
```

5. Rebuild do frontend (e novo deploy no GitHub Pages, se a URL pública deve usar o servidor da LAN — em geral Pages na internet **não** alcança IP local; para acesso público continue na nuvem ou use VPN/túnel).

---

## 8. Checklist final

- [ ] Docker rodando  
- [ ] `supabase start` OK e keys anotadas  
- [ ] `schema.sql` + `grants.sql` aplicados no local  
- [ ] Dump `public` da nuvem gerado  
- [ ] Dados importados (ordem correta se houver FK com Auth)  
- [ ] Estratégia de Auth definida (dump `auth` **ou** recriar usuário)  
- [ ] `frontend/.env` apontando para `127.0.0.1:54321`  
- [ ] Login gestor testado  
- [ ] Cadastro / Timeline testados  
- [ ] Senhas e dumps guardados fora do Git  

---

## 9. Segurança

- **Nunca** commit o arquivo `.env`, dumps `.sql` com dados reais, nem a senha do banco.  
- Coloque dumps em pasta ignorada pelo Git ou fora do repositório.  
- Depois de testes, apague dumps com dados de produção do disco.  
- Tokens de acesso (ex.: `sbp_...`) devem ser revogados se foram expostos.

Sugestão de ignore (já existe `.env` no `.gitignore` do projeto). Para dumps locais, você pode criar na raiz:

```
Transferir para Servidor/*.sql
!Transferir para Servidor/*.md
```

---

## 10. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---------|----------------|-------------|
| `permission denied for table ...` | Faltou `grants.sql` | Rodar `supabase/grants.sql` |
| Login OK mas organização vazia | `app_state` não importado | Reimportar dados `public` |
| Login OK mas “perfil não encontrado” | `profiles` / Auth desalinhados | Recriar profile ou migrar `auth.users` |
| Frontend ainda fala com a nuvem | `.env` antigo ou build antigo | Conferir `VITE_SUPABASE_URL` e reiniciar Vite |
| GitHub Pages não vê o servidor da LAN | Pages é público na internet | Use nuvem, VPN ou hospede o front na mesma rede |

---

## 11. Resumo em uma frase

**Suba um Supabase local com Docker → aplique `schema.sql` + `grants.sql` → exporte/importe o schema `public` da nuvem → reconecte Auth → aponte o `frontend/.env` para `http://127.0.0.1:54321`.**

Se quiser, no próximo passo podemos transformar este guia em scripts automatizados (`exportar-nuvem.ps1` / `importar-local.ps1`) dentro desta mesma pasta.
