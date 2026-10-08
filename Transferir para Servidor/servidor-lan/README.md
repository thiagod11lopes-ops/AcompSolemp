# Servidor LAN — Etapa 4A (produção na rede local)

Prova de conceito: **build React** + **Caddy** na porta **8080** (LAN) + **Supabase local** apenas em `127.0.0.1:54321` (proxy reverso, sem expor Postgres).

## Configuração única do IP

1. Copie `servidor.env.example` → `servidor.env`
2. Defina `ACOMOPMS_LAN_HOST=192.168.x.x` (ou `auto`)

Esse arquivo alimenta build, Auth e testes. **Não** edite vários arquivos ao mudar o IP.

## Windows (PowerShell, na raiz do repositório)

```powershell
supabase start
bash "Transferir para Servidor/aplicar-schema-local.sh"   # ou já aplicado

node "Transferir para Servidor/servidor-lan/configure-auth.mjs"
supabase stop; supabase start

powershell -File "Transferir para Servidor/servidor-lan/build-producao-lan.ps1"
powershell -File "Transferir para Servidor/servidor-lan/start-servidor-lan.ps1"
```

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

## Teste

```bash
cd frontend && npm ci   # se necessário
ln -sf ../frontend/node_modules "../Transferir para Servidor/servidor-lan/node_modules"
node "Transferir para Servidor/servidor-lan/teste-servidor-lan.mjs"
```

## URLs

| Uso | URL |
|-----|-----|
| No próprio servidor | `http://127.0.0.1:8080` ou `http://localhost:8080` |
| Outros PCs/celulares | `http://<ACOMOPMS_LAN_HOST>:8080` |
| API Supabase (cliente) | Mesma origem `:8080` (paths `/auth`, `/rest`, `/storage`, `/realtime`, `/functions`) |
| Postgres | `127.0.0.1:54322` — **não** usar na LAN |
| Studio | `127.0.0.1:54323` — **não** expor para usuários |

## Parar Caddy

```bash
bash "Transferir para Servidor/servidor-lan/stop-servidor-lan.sh"
```
