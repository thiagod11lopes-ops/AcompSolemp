# Checklist — Transferir para servidor local

Use junto com o [README.md](./README.md).

## Antes

- [ ] Docker Desktop instalado e em execução
- [ ] Senha do banco Supabase (nuvem) em mãos
- [ ] Connection string URI anotada (Dashboard → Database)
- [ ] Backup/export planejado (espaço em disco)

## Ambiente local

- [ ] `supabase init` / `supabase start` concluído
- [ ] API URL e anon key locais anotados
- [ ] `supabase/schema.sql` aplicado
- [ ] `supabase/grants.sql` aplicado

## Dados

- [ ] Dump `public` gerado (`tenants`, `app_state`, `profiles`, `email_access`)
- [ ] Dump importado no Postgres local
- [ ] Auth: dump `auth` **ou** usuário gestor recriado + profiles ajustados

## App

- [ ] `frontend/.env` com URL local (`http://127.0.0.1:54321`)
- [ ] `npm run dev` reiniciado
- [ ] Login gestor OK
- [ ] Dados da organização aparecem (pedidos/cadastros)

## Segurança

- [ ] Nenhum `.sql` com dados reais commitado no Git
- [ ] Tokens sensíveis revogados se foram compartilhados
