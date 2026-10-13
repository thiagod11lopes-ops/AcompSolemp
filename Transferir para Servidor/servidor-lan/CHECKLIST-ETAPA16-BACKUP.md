# Checklist — Etapa 16 (backup / restore Postgres local)

Rotina para o **PC servidor** com Supabase local (Docker) em produção LAN.

## Antes de atualizar o Git ou migrar dados

- [ ] `supabase start` ativo
- [ ] Backup: `node backup-banco-local.mjs` (ou `backup-banco-local.ps1` / `.sh`)
- [ ] Arquivos em `backups/*.dump` + `*.meta.json` copiados para **HD externo / NAS** (não commitar)
- [ ] `node verificar-backup-local.mjs` → **✅ Backup íntegro**

## Restore (emergência ou rollback)

- [ ] Avisar usuários (downtime)
- [ ] `node restaurar-banco-local.mjs --file backups/<arquivo>.dump --confirm`
- [ ] `start-servidor-lan` + `rodar-testes-lan`

## O que entra no backup

| Incluído | Observação |
|----------|------------|
| Schema `public` + dados | App AcompOPMS |
| Schema `auth` | Usuários/senhas Supabase Auth |
| Demais schemas do cluster local | Comportamento padrão `pg_dump` |

| Fora do escopo (Etapa 16) | |
|---------------------------|---|
| Arquivos Storage (`planilha-anexos`) | Export separado no Dashboard/CLI Supabase |
| `servidor.env`, WireGuard, `connection.json` | Copiar manualmente com o dump |

## Frequência sugerida

- **Diário** (automático futuro Manager) ou **antes de cada `git pull`** no servidor
- Após importação da nuvem ([`Transferir para Servidor/README.md`](../README.md))

Plano self-hosted **16/16** concluído após esta etapa estar aplicada no servidor.
