# Checklist — Etapa 4 (validação servidor LAN)

Use após [Etapas 1–3](./README.md) no **PC servidor**.

## Pré-requisitos

- [ ] Docker Desktop em execução
- [ ] Supabase CLI instalado (`supabase start` OK)
- [ ] Caddy no PATH
- [ ] Node.js 20+
- [ ] `frontend/node_modules` (`cd frontend && npm ci`)

## Configuração

- [ ] `servidor.env` criado (cópia de `servidor.env.example`)
- [ ] `ACOMOPMS_LAN_HOST` correto (ou `auto`)
- [ ] `aplicar-auth-lan` executado após mudar IP/porta
- [ ] `build-producao-lan` executado (existe `frontend/dist/lan-build.json`)

## Serviços

- [ ] `supabase start` ativo
- [ ] Schema aplicado (`aplicar-schema-local.sh`)
- [ ] Caddy ativo (`start-servidor-lan`)
- [ ] `http://127.0.0.1:8080/login` abre no navegador do servidor
- [ ] (Opcional) Firewall: `corrigir-acesso-lan-firewall.ps1` como Admin
- [ ] Outro PC/celular na mesma Wi‑Fi abre `http://<IP-LAN>:8080/login`

## Teste automático

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/rodar-testes-lan.ps1"
```

- [ ] Saída **todos ✅** (ou revise `test-report-lan.json`)

## Cliente AcompOPMS (outro PC)

- [ ] Instalador com URL `http://<IP-LAN>:8080/login`
- [ ] Login manual OK no app desktop

## Segurança

- [ ] Usuários usam só porta **8080** (não `:54321` / `:54322` na LAN)
- [ ] Nenhum dump SQL com dados reais no Git
