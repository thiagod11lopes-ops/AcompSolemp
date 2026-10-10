# Contrato `server-manifest` — Acomp Server Manager × AcompOPMS

**Etapa 9** — documentação de referência para quem implementa o **Acomp Server Manager** (repositório futuro) e para manutenção do manifesto neste repositório.

| Par atual | Valor |
|-----------|--------|
| `manifestVersion` (AcompSolemp) | **1.2.0** |
| `schemaVersion` | **1.0.0** |
| `manager.backendProfile` / `installPlan.profile` | **supabase-local-v1** |
| Arquivo manifesto | [`server-manifest.json`](../server-manifest.json) |
| JSON Schema | [`schemas/server-manifest.schema.json`](../schemas/server-manifest.schema.json) |

---

## 1. Finalidade

O contrato permite que um **instalador externo** clone um repositório GitHub, leia **`server-manifest.json` na raiz do clone** e descubra **como** provisionar aquele sistema como servidor (requisitos, fases, scripts, portas, validação), **sem** embutir lógica de negócio da aplicação no Manager.

- Cada **sistema** (ex.: AcompOPMS) versiona o **próprio** manifesto.
- O **Manager** versiona o **JSON Schema** de validação (cópia em `schemas/` até existir o repo `acom-server-manager`).

---

## 2. Artefatos e responsabilidades

| Artefato | Caminho | Papel |
|----------|---------|--------|
| **`server-manifest.json`** | Raiz do clone | Plano de instalação **deste** produto: scripts, `installPlan`, rede LAN, overlay (planejado), validação. |
| **`server-manifest.schema.json`** | `schemas/` | Forma genérica do JSON; **não** contém regras de negócio AcompOPMS. |
| **`server-connection.json`** | `frontend/dist/` (HTTP `/server-connection.json`) | **Runtime** após instalação: URL de login, modo LAN/overlay, metadados para Manager e instalador desktop. |
| **`servidor.env`** | `Transferir para Servidor/servidor-lan/` | Fonte única de IP/porta LAN e flags overlay (não commitar valores reais). |
| **`connection.json`** | Pasta de instalação AcompOPMS | Pareamento overlay (export Manager **Etapa 6**); cliente **Etapa 12** — [`connection-json-contract.md`](./connection-json-contract.md). |

---

## 3. Fluxo que o Manager deve implementar

```mermaid
sequenceDiagram
  participant U as Usuário
  participant M as Acomp Server Manager
  participant R as Repo clonado
  participant S as Scripts servidor-lan
  participant C as Caddy :8080

  U->>M: URL GitHub + pasta destino
  M->>R: git clone
  M->>R: ler server-manifest.json
  M->>M: validar schema + semântica
  M->>S: executar installPlan.phases
  S->>C: build + proxy + Supabase local
  M->>C: GET /server-connection.json
  M->>U: exibir loginUrl (LAN)
  Note over M,U: Overlay: Etapas 5–6; cliente Etapa 12
  U->>M: copiar URL para Instalador OPMS
```

**Ordem resumida (manifesto `installPlan.profile = supabase-local-v1`):**

1. `supabase.ensure-started` (Docker + `supabase start`)
2. `apply-local-schema`
3. `configure-auth-lan` + `supabase.restart`
4. Build LAN (`build-production-lan-*`)
5. `generate-caddyfile`
6. **`connection.generate-runtime`** → `gerar-server-connection.mjs`
7. `start-server-lan-*`
8. (Windows) `firewall-lan-windows`
9. `test-server-lan` ou `run-tests-lan-*`

Detalhe de cada fase: campo `installPlan.phases[]` em [`server-manifest.json`](../server-manifest.json).

---

## 4. Campo `$schema` no manifesto

Hoje:

```json
"$schema": "./schemas/server-manifest.schema.json"
```

- **Relativo:** funciona offline no clone e na CI.
- **HTTPS público:** só depois de release estável no repo `acom-server-manager` (ver §10).

---

## 5. Validação (Manager e CI)

### 5.1 JSON Schema (Etapa 8)

```bash
cd schemas && npm ci && npm run validate
```

### 5.2 Semântica no clone (Etapa 7 + 8)

```bash
node "Transferir para Servidor/servidor-lan/validar-server-manifest.mjs"
```

O Manager deve reproduzir equivalente:

| Checagem | Onde no manifesto |
|----------|-------------------|
| JSON válido | parse |
| Schema | `schemaVersion` + schema embutido no Manager |
| Scripts existem | `scripts.items[].path` |
| IDs referenciados | `installPlan`, `validation.postInstall`, `clientConnection.runtimeDescriptor` |
| DAG de fases | `installPlan.phases[].dependsOn` |
| SO suportado | `manager.supportedPlatforms` |
| Versão mínima | `manager.minManagerVersion` |

CI: job **`validate-server-manifest`** em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## 6. Rede e URL para o usuário

### 6.1 Modos (`network.accessModes`)

| `id` | Status no AcompOPMS | Uso |
|------|---------------------|-----|
| `lan` | **active** | Mesma Wi‑Fi/Ethernet; porta HTTP Caddy (padrão **8080**). |
| `overlay` | **planned** | Internet via WireGuard/Headscale (Etapas 5–6 no servidor, 12 no cliente). |

### 6.2 Template de URL (`network.accessUrl`)

- Origem: `http://{lanHost}:{httpPort}`
- Login: `network.accessUrl.loginUrlTemplate` → `http://{lanHost}:{httpPort}/login`
- Variáveis resolvidas a partir de **`servidor.env`** (`ACOMOPMS_LAN_HOST`, `ACOMOPMS_HTTP_PORT`).
- `lanHost=auto`: scripts detectam o primeiro IPv4 não loopback (Manager deve replicar ou executar script que já resolve).

### 6.3 Portas

| Expor na LAN | Não expor |
|--------------|-----------|
| **8080** TCP (Caddy — UI + API via proxy) | **54321** Kong, **54322** Postgres, **54323** Studio, demais portas Supabase |

Usuários finais e **Instalador OPMS** usam **apenas** a origem `:8080`, nunca `:54321` no browser.

---

## 7. Bloco `clientConnection` (manifesto 1.2.0)

Descreve como o **Instalador OPMS** (desktop) se conecta ao servidor.

| Campo | Significado |
|-------|-------------|
| `wizardUrlField` | Nome lógico do campo no wizard (`startUrl`). |
| `lan.accessUrlTemplate` | URL que o Manager deve mostrar e o usuário cola no instalador. |
| `lan.discoveryHttpPath` | **`/server-connection.json`** — preferir leitura HTTP após instalação. |
| `lan.sameOriginSupabaseApi` | `true`: `VITE_SUPABASE_URL` = mesma origem (Caddy faz proxy). |
| `overlay.*` | Metadados até Etapas 5–6; `pairingArtifactFileName`: **`connection.json`**. |
| `runtimeDescriptor.generatorScriptId` | **`generate-server-connection`** |
| `desktopClient.relativePath` | **`Instalador OPMS/cliente`** — Electron Etapa 10 |

**Regra para o Manager:** após `installPlan` concluir com sucesso, fazer `GET {publicOrigin}/server-connection.json` e exibir `client.recommendedStartUrl` (ou `lan.loginUrl`).

---

## 8. Runtime `server-connection.json`

Gerado por [`gerar-server-connection.mjs`](../Transferir para Servidor/servidor-lan/gerar-server-connection.mjs) (fase `connection.generate-runtime`).

**Schema lógico:** `acomopms-server-connection/1` (campo `schema` no JSON).

Exemplo (campos principais):

```json
{
  "schema": "acomopms-server-connection/1",
  "manifestVersion": "1.2.0",
  "accessMode": "lan",
  "lan": {
    "host": "192.168.0.42",
    "httpPort": 8080,
    "origin": "http://192.168.0.42:8080",
    "loginUrl": "http://192.168.0.42:8080/login",
    "supabaseUrl": "http://192.168.0.42:8080"
  },
  "overlay": {
    "enabled": false,
    "status": "disabled"
  },
  "client": {
    "recommendedStartUrl": "http://192.168.0.42:8080/login",
    "discoveryPath": "/server-connection.json",
    "pairingFile": "connection.json"
  }
}
```

Quando `ACOMOPMS_OVERLAY_ENABLED=true` (futuro), `accessMode` pode ser `overlay` e `recommendedStartUrl` usa o host overlay.

---

## 9. Bloco `overlay` (servidor — planejado)

Objetivo: acesso **pela internet** sem instalar Tailscale; VPN **embutida** no Manager e no Instalador OPMS.

| Item | Valor no manifesto |
|------|---------------------|
| `technology.dataPlane` | wireguard |
| `technology.controlPlane` | headscale |
| Config | chaves `ACOMOPMS_OVERLAY_*` em `servidor.env` (ver [`servidor.env.example`](../Transferir para Servidor/servidor-lan/servidor.env.example)) |
| UDP | `ACOMOPMS_OVERLAY_WG_PORT` (padrão **51820**) — encaminhar no roteador quando ativo |
| Fases futuras | `overlay.server`, `overlay.pairing-export` |
| Pareamento | **`connection.json`** (Etapa 6) |

Enquanto `overlay.status` indicar desabilitado, o Manager opera **somente LAN**.

---

## 10. Configuração única (`configuration` + `servidor.env`)

| Chave | Função |
|-------|--------|
| `ACOMOPMS_LAN_HOST` | IP LAN ou `auto` |
| `ACOMOPMS_HTTP_PORT` | Porta Caddy (padrão 8080) |
| `ACOMOPMS_SUPABASE_INTERNAL` | Upstream Kong local (`127.0.0.1:54321`) |
| `ACOMOPMS_OVERLAY_*` | Overlay (futuro) |

Artefatos gerados (não editar à mão): listados em `configuration.generatedArtifactsRelativePaths` no manifesto.

---

## 11. Catálogo de scripts (`scripts.items`)

O Manager invoca scripts por **`id`**, não por path livre. IDs usados no AcompOPMS (consulte o manifesto para paths exatos):

| ID | Propósito |
|----|-----------|
| `apply-local-schema` | Schema, migrations, grants, storage |
| `configure-auth-lan` | `site_url` / redirects Supabase Auth |
| `build-production-lan-sh` / `build-production-lan-ps1` | Build `frontend/dist` |
| `generate-caddyfile` | `Caddyfile.generated` |
| `generate-server-connection` | `server-connection.json` |
| `start-server-lan-sh` / `start-server-lan-ps1` | Sobe Caddy |
| `stop-server-lan-sh` / `stop-server-lan-ps1` | Para Caddy |
| `test-server-lan` | Testes E2E via proxy |
| `run-tests-lan-sh` / `run-tests-lan-ps1` | Wrapper com deps |
| `prepare-server-lan-ps1` | Orquestração Windows |
| `firewall-lan-windows` | Regra firewall (Admin) |
| `validate-server-manifest` | Validação local manifesto |

Capabilities (`supabase.ensure-started`, `supabase.restart`) são **implementação do Manager**, não scripts no repo.

---

## 12. Validação pós-instalação

| Teste | Obrigatório | Contexto |
|-------|-------------|----------|
| `test-server-lan` | sim | HTTP UI, `/login`, `/server-connection.json`, Auth, REST, Storage, Realtime |
| `test-local-supabase` | não | API direta `:54321` (dev) |

Checklists humanos: `validation.checklistRelativePaths` no manifesto (inclui [`CHECKLIST-ETAPA4.md`](../Transferir para Servidor/servidor-lan/CHECKLIST-ETAPA4.md)).

---

## 13. Versionamento

| Tipo | Campo | Regra |
|------|--------|--------|
| Manifesto | `manifestVersion` | **Minor** = campos opcionais novos (ex.: 1.1 → 1.2 `clientConnection`); **major** = quebra de fases/contrato. |
| Schema | `schemaVersion` / URN `1.0.0` | Publicado com o Manager; extensões como Etapa 8 permanecem compatíveis com `additionalProperties`. |
| Manager | `manager.minManagerVersion` | Manifesto exige ≥ versão do instalador. |
| Perfil | `backendProfile` | String opaca; plugin `supabase-local-v1` no Manager. |

**Histórico AcompOPMS:**

| Versão | Mudança |
|--------|---------|
| 1.1.0 | Plano LAN Supabase + Caddy + scripts |
| 1.2.0 | `clientConnection`, `overlay`, `network.accessModes`, fase `connection.generate-runtime` |

---

## 14. Publicação do schema no repo `acom-server-manager` (proposta)

| Item | Proposta |
|------|----------|
| Caminho canônico | `schemas/server-manifest.schema.json` |
| `$id` HTTP (após tag) | `https://raw.githubusercontent.com/<ORG>/acom-server-manager/<TAG>/schemas/server-manifest.schema.json` |
| `$id` até lá | `urn:acom-server-manager:server-manifest:schema:1.0.0` |
| Distribuição | Schema embutido no executable do Manager + sync por tag |

Este repositório mantém cópia em `schemas/` para dev/CI; **fonte de verdade** passa ao repo Manager quando existir.

---

## 15. Referências no repositório

| Documento | Conteúdo |
|-----------|----------|
| [`schemas/README.md`](../schemas/README.md) | Comandos AJV |
| [`Transferir para Servidor/servidor-lan/README.md`](../Transferir%20para%20Servidor/servidor-lan/README.md) | Operação LAN no host |
| [`Transferir para Servidor/CHECKLIST.md`](../Transferir%20para%20Servidor/CHECKLIST.md) | Migração / checklist geral |

---

## 16. O que **não** é responsabilidade deste contrato

- Lógica de telas, pedidos, SOLEMP ou RLS específicos (ficam no app e no Supabase).
- Implementação UI do Acomp Server Manager (repo separado).
- Pareamento WireGuard e `connection.json` (Etapas 5–6 — documentados aqui como planejamento).
- Auto-update do Instalador OPMS instalado (fluxo distinto; URL aponta para servidor, não para “pull” do GitHub no desktop).
