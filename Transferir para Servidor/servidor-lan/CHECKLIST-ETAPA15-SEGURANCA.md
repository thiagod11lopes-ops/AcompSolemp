# Checklist — Etapa 15 (segurança LAN — não expor Postgres/Supabase)

Após [Etapas 1–4](./README.md) e com Caddy no ar.

## Objetivo

Clientes na Wi‑Fi/Ethernet usam **somente** `http://<IP-LAN>:8080`. Portas **54321–54323** (e demais portas Supabase locais) **não** devem aceitar conexão pelo IP LAN da máquina.

## Windows (Admin)

- [ ] Etapa 4B OK: `corrigir-acesso-lan-firewall.ps1`
- [ ] Etapa 15: `aplicar-seguranca-lan-firewall.ps1`
- [ ] Verificação: `node verificar-seguranca-lan.mjs` → **✅ Segurança LAN OK**

## Linux

- [ ] HTTP liberado na porta configurada (`ACOMOPMS_HTTP_PORT`, padrão 8080)
- [ ] `sudo bash aplicar-seguranca-lan-firewall.sh` (ufw) **ou** regras iptables/nftables equivalentes
- [ ] `node verificar-seguranca-lan.mjs`

## Comportamento esperado

- [ ] No **servidor**, `http://127.0.0.1:8080/login` funciona
- [ ] Em **outro PC**, `http://<IP-LAN>:8080/login` funciona
- [ ] Em **outro PC**, `http://<IP-LAN>:54322` **não** conecta (timeout/recusa)
- [ ] Postgres/Studio continuam em **127.0.0.1** para manutenção no próprio servidor

## Documentação

- [ ] Equipe informada: nunca compartilhar URL com `:54321` / `:54322`
- [ ] [Guia de uso](../../docs/guia-uso-servidor-lan.md) — seção segurança

Próxima etapa do plano: **16** — [CHECKLIST-ETAPA16-BACKUP.md](./CHECKLIST-ETAPA16-BACKUP.md).
