# Servidor LAN — Etapa 1 (produção na rede local)

Prova de conceito: **build React** + **Caddy** na porta **8080** (LAN) + **Supabase local** apenas em `127.0.0.1:54321` (proxy reverso, sem expor Postgres).

## Configuração única do IP

1. Copie `servidor.env.example` → `servidor.env`
2. Defina `ACOMOPMS_LAN_HOST=192.168.x.x` (ou `auto`)

Esse arquivo alimenta build, Auth e testes. **Não** edite vários arquivos ao mudar o IP.

## Windows (rápido)

Na raiz do repositório, com **Docker**, **Supabase CLI**, **Node 20+** e **Caddy** no PATH:

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/preparar-servidor-lan.ps1"
```

Passo a passo manual (mesma ordem):

```powershell
supabase start
bash "Transferir para Servidor/aplicar-schema-local.sh"
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/build-producao-lan.ps1"
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/start-servidor-lan.ps1"
```

### Etapa 2 — Auth / login na LAN

Sempre que mudar `servidor.env` (IP ou porta):

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/aplicar-auth-lan.ps1"
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/build-producao-lan.ps1"
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/start-servidor-lan.ps1"
```

Linux:

```bash
bash "Transferir para Servidor/servidor-lan/aplicar-auth-lan.sh"
bash "Transferir para Servidor/servidor-lan/build-producao-lan.sh"
bash "Transferir para Servidor/servidor-lan/start-servidor-lan.sh"
```

URL de login: `http://<IP-LAN>:8080/login` (use a porta de `ACOMOPMS_HTTP_PORT`).

### Etapa 3 — Build frontend (VITE_* via Caddy)

O build grava `frontend/.env.production.local` com:

- `VITE_DATA_SOURCE=supabase`
- `VITE_SUPABASE_URL=http://<IP-LAN>:8080` (mesma origem da UI — **não** use `:54321` no browser)
- `VITE_SUPABASE_ANON_KEY` do `supabase status`

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/build-producao-lan.ps1"
node "Transferir para Servidor/servidor-lan/verificar-build-lan.mjs"
```

Sempre **depois** da Etapa 2 se mudou IP/porta. O arquivo `frontend/dist/lan-build.json` registra a origem usada no build.

### Etapa 4B — Acesso LAN no Windows (firewall)

Se `http://127.0.0.1:8080` funciona mas `http://<IP_LAN>:8080` não (nem no próprio PC), o Caddy já escuta em `0.0.0.0` — crie a regra de entrada **somente** para esta etapa:

```powershell
# PowerShell **como Administrador**, na raiz do repositório
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/corrigir-acesso-lan-firewall.ps1"
```

O script confirma IPv4 LAN, Caddy, `LISTEN` em `0.0.0.0:8080`, cria/atualiza a regra **AcompOPMS - LAN HTTP (TCP 8080)** (TCP **8080**, perfil **Private**) e testa localhost + IP LAN.

**URL no celular:** `http://<IP exibido pelo script>:8080` (mesma Wi-Fi). Se o servidor passar nos testes e o celular ainda falhar, suspeite de **AP isolation** no roteador.

Nesta etapa **não** bloqueie 54321–54323; isso fica para depois.

O Docker costuma publicar também `54321` (API), `54322` (Postgres) e `54323` (Studio) em `0.0.0.0`. **Usuários finais devem usar só `:8080`.** No firewall, **bloqueie** 54322/54323 na rede local; considere bloquear 54321 e usar apenas o proxy Caddy (etapa futura).

## Linux (validação / servidor)

```bash
cp "Transferir para Servidor/servidor-lan/servidor.env.example" "Transferir para Servidor/servidor-lan/servidor.env"
node "Transferir para Servidor/servidor-lan/configure-auth.mjs"
supabase stop && supabase start

bash "Transferir para Servidor/servidor-lan/build-producao-lan.sh"
bash "Transferir para Servidor/servidor-lan/start-servidor-lan.sh"
```

### Etapa 4 — Validação automática

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/rodar-testes-lan.ps1"
```

Linux:

```bash
bash "Transferir para Servidor/servidor-lan/rodar-testes-lan.sh"
```

Checklist manual: [CHECKLIST-ETAPA4.md](./CHECKLIST-ETAPA4.md). Saída JSON: `test-report-lan.json` (gitignored).

### Etapa 7 — `server-manifest.json` + URL para o Manager

Contrato na **raiz do repo**: [`server-manifest.json`](../../server-manifest.json) (`manifestVersion` **1.2.0**) — LAN ativa + parâmetros **overlay** (WireGuard/Headscale, Etapas 5–6).

Após build/start, o servidor publica:

- **`http://<IP-LAN>:8080/server-connection.json`** — URL de login e metadados overlay
- Validação: `node "Transferir para Servidor/servidor-lan/validar-server-manifest.mjs"`

Documentação: [`docs/server-manifest-contract.md`](../../docs/server-manifest-contract.md).

## URLs

| Uso | URL |
|-----|-----|
| No próprio servidor | `http://127.0.0.1:8080` ou `http://localhost:8080` |
| Outros PCs/celulares | `http://<ACOMOPMS_LAN_HOST>:8080` |
| API Supabase (cliente) | Mesma origem `:8080` (paths `/auth`, `/rest`, `/storage`, `/realtime`, `/functions`) |
| Postgres | `127.0.0.1:54322` — **não** usar na LAN |
| Studio | `127.0.0.1:54323` — **não** expor para usuários |

## Parar Caddy

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/stop-servidor-lan.ps1"
```

```bash
bash "Transferir para Servidor/servidor-lan/stop-servidor-lan.sh"
```

## Arquivos desta pasta

| Arquivo | Função |
|---------|--------|
| `servidor.env.example` → `servidor.env` | IP LAN e porta HTTP |
| `build-producao-lan.*` | Build `frontend/dist` com VITE_* LAN |
| `lib/write-frontend-env-lan.mjs` | Gera `.env.production.local` |
| `verificar-build-lan.mjs` | Confere bundles apontam para origem LAN |
| `generate-caddyfile.mjs` | Gera `Caddyfile.generated` |
| `start-servidor-lan.*` / `stop-servidor-lan.*` | Sobe/para Caddy |
| `corrigir-acesso-lan-firewall.ps1` | Firewall Windows (Admin) |
| `rodar-testes-lan.*` | Etapa 4 — prepara deps e roda testes |
| `teste-servidor-lan.mjs` | Testes HTTP + API + Auth + dados |
| `CHECKLIST-ETAPA4.md` | Checklist pós-instalação |
| `configure-auth.mjs` | Grava `site_url` / redirects no `supabase/config.toml` |
| `aplicar-auth-lan.*` | Auth + reinicia Supabase (Etapa 2) |
| `preparar-servidor-lan.ps1` | Orquestra setup Windows (Etapas 1+2) |
