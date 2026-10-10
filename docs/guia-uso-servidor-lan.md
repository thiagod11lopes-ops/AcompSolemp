# Guia de uso — AcompOPMS self-hosted (servidor LAN + clientes)

**Etapa 14** — como usar o sistema no dia a dia, sem Tailscale externo.

| Papel | O que é | O que o usuário precisa |
|-------|---------|-------------------------|
| **PC servidor** | Um computador na organização com Docker, Supabase local e Caddy | Fica ligado na rede; é o “banco + site” |
| **PC cliente** | Outros computadores com **AcompOPMS** instalado | Só a URL (LAN) ou `connection.json` (internet) |
| **Celular / navegador** | Qualquer dispositivo na mesma Wi‑Fi | Abrir `http://<IP-servidor>:8080/login` no browser |
| **Acomp Server Manager** | App futuro que automatiza o servidor | Mesmo fluxo manual descrito abaixo, até o Manager existir |

Contrato técnico (desenvolvedores): [`server-manifest-contract.md`](./server-manifest-contract.md).

---

## 1. Visão geral

```text
                    ┌─────────────────────────────┐
                    │   PC SERVIDOR (LAN)         │
                    │   Docker + Supabase local   │
                    │   Caddy :8080               │
                    │   Postgres só em 127.0.0.1  │
                    └──────────────┬──────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │ Wi‑Fi / Ethernet       │  Internet (opcional)   │
          ▼                        ▼                        │
   Instalador AcompOPMS      WireGuard overlay              │
   http://IP:8080/login      + connection.json              │
          │                        │                        │
          ▼                        ▼                        │
   Celular (browser)         PC remoto com VPN              │
```

- **Sempre** use a porta **8080** (ou a definida em `servidor.env`). **Não** exponha `54321` / `54322` para usuários.
- O instalador desktop **não** baixa atualizações do GitHub sozinho: ele abre o **servidor** que você configurou. Atualizar o app = atualizar o **servidor** (build) e, se necessário, reinstalar clientes.

---

## 2. Ordem recomendada (primeira implantação)

1. **Servidor LAN** — Etapas 1–4 ([`servidor-lan/README.md`](../Transferir%20para%20Servidor/servidor-lan/README.md), [checklist Etapa 4](../Transferir%20para%20Servidor/servidor-lan/CHECKLIST-ETAPA4.md)).
2. **Segurança LAN (Etapa 15)** — [`aplicar-seguranca-lan-firewall`](../Transferir%20para%20Servidor/servidor-lan/aplicar-seguranca-lan-firewall.ps1) + [`verificar-seguranca-lan.mjs`](../Transferir%20para%20Servidor/servidor-lan/verificar-seguranca-lan.mjs) ([checklist](../Transferir%20para%20Servidor/servidor-lan/CHECKLIST-ETAPA15-SEGURANCA.md)).
3. **Clientes na rede** — Instalador portable ([`Instalador OPMS`](../Instalador%20OPMS/README.md)): URL `http://<IP-LAN>:8080/login`.
4. **Internet (opcional)** — Overlay Etapas 5–6 no servidor + `connection.json` no instalador ([checklists overlay](../Transferir%20para%20Servidor/servidor-lan/CHECKLIST-ETAPA5-OVERLAY.md) e [pareamento](../Transferir%20para%20Servidor/servidor-lan/CHECKLIST-ETAPA6-PAIRING.md)).

Migração de dados da **nuvem Supabase** para o servidor local: [`Transferir para Servidor/README.md`](../Transferir%20para%20Servidor/README.md) (fluxo distinto, faça **antes** ou **depois** de colocar o LAN no ar).

---

## 3. PC servidor (Windows — resumo)

**Requisitos:** Docker Desktop, Supabase CLI, Node 20+, Caddy no PATH.

1. Clone o repositório e copie `Transferir para Servidor/servidor-lan/servidor.env.example` → `servidor.env`.
2. Ajuste `ACOMOPMS_LAN_HOST` (IP fixo da máquina na Wi‑Fi ou `auto`).
3. Na raiz do repo:

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/preparar-servidor-lan.ps1"
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/preparar-servidor-lan.ps1" -RunTests
```

4. Se outro PC na rede não abrir o IP: firewall — [`corrigir-acesso-lan-firewall.ps1`](../Transferir%20para%20Servidor/servidor-lan/corrigir-acesso-lan-firewall.ps1) **como Administrador**.
5. **Etapa 15:** [`aplicar-seguranca-lan-firewall.ps1`](../Transferir%20para%20Servidor/servidor-lan/aplicar-seguranca-lan-firewall.ps1) (Admin) e `node verificar-seguranca-lan.mjs` — Postgres/Supabase não devem responder pelo IP LAN.

**URL para repassar aos clientes:**

- Login: `http://<IP-LAN>:8080/login`
- Descoberta automática: `http://<IP-LAN>:8080/server-connection.json`

Anote o IP exibido pelos scripts ou em `server-connection.json` → campo `lan.loginUrl`.

---

## 4. PC cliente (Instalador AcompOPMS)

### Onde baixar o instalador

GitHub → **Actions** → workflow **Build Instalador AcompOPMS** → artefato **`AcompOPMS-Instalador-win-x64`** (`.exe` portable).

### Instalação

1. Execute o `.exe` (Windows).
2. Cole a **URL do Manager/servidor**, por exemplo:  
   `http://192.168.0.42:8080/login`
3. Deixe marcado **Criar atalho AcompOPMS** (padrão).
4. Conclua a instalação.

Pasta típica: `%LOCALAPPDATA%\AcompOPMS\`  
Config: `acomopms-desktop.config.json` com `startUrl`.

### Acesso pela internet (opcional)

1. No **servidor**, exporte um arquivo por cliente (Etapa 6):

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/exportar-connection-json.ps1" -Name "Nome-do-PC"
```

2. No instalador, use **Escolher connection.json…** (ou copie o arquivo para `%LOCALAPPDATA%\AcompOPMS\connection.json`).
3. WireGuard deve estar instalado no Windows; o app tenta subir o túnel ao abrir.

Detalhes: [`connection-json-contract.md`](./connection-json-contract.md).

---

## 5. Celular ou outro navegador (só LAN)

Na **mesma rede Wi‑Fi** do servidor:

`http://<IP-LAN>:8080/login`

Não é necessário instalador. Se não carregar, verifique firewall do servidor e **isolamento de AP** no roteador.

---

## 6. O que informar em cada lugar

| Situação | Valor |
|----------|--------|
| Instalador desktop (rede local) | `http://<IP-LAN>:8080/login` |
| Instalador + internet (overlay) | Importar `connection.json` + manter URL LAN como fallback |
| Manager (futuro) | Ler `server-connection.json` após instalar o servidor |
| Desenvolvimento no próprio servidor | `http://127.0.0.1:8080` ou `npm run dev` em `frontend/` |

---

## 7. Manutenção e atualizações

| Ação | Onde |
|------|------|
| Mudou IP da rede | Editar `servidor.env` → `aplicar-auth-lan` → `build-producao-lan` → reiniciar Caddy; **reinstalar** ou editar `startUrl` nos clientes |
| Atualizou código no GitHub | No servidor: `git pull`, schema se houver SQL novo, rebuild LAN, testes |
| Backup do banco | Postgres local (Docker); ver Etapa 16 (quando documentada) |
| Novo PC na internet | Novo `exportar-connection-json` no servidor |

---

## 8. Problemas comuns

| Sintoma | O que verificar |
|---------|------------------|
| `127.0.0.1:8080` OK, IP LAN não | Firewall Windows ([Etapa 4B](../Transferir%20para%20Servidor/servidor-lan/README.md)); Caddy em `0.0.0.0` |
| Login falha após mudar IP | Rodar `aplicar-auth-lan` e reiniciar Supabase |
| Cliente abre em branco / erro rede | `startUrl` errada; servidor desligado; porta 8080 bloqueada |
| Instalador trava em 95% / EBUSY | Fechar AcompOPMS; reinstalar; pasta `.old-*` em `%LOCALAPPDATA%` |
| Overlay não conecta | Etapa 5 no servidor; UDP encaminhado; WireGuard instalado; Admin no Windows |
| App mostra dados vazios | Schema/migrations não aplicados; migração da nuvem não feita |

Teste automático no servidor:

```powershell
powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/rodar-testes-lan.ps1"
```

---

## 9. Referências rápidas

| Documento | Conteúdo |
|-----------|----------|
| [`servidor-lan/README.md`](../Transferir%20para%20Servidor/servidor-lan/README.md) | Scripts e etapas técnicas 1–6 |
| [`Instalador OPMS/README.md`](../Instalador%20OPMS/README.md) | Cliente + wizard + CI |
| [`CHECKLIST-ETAPA4.md`](../Transferir%20para%20Servidor/servidor-lan/CHECKLIST-ETAPA4.md) | Validação pós-instalação servidor |
| [`CHECKLIST-ETAPA15-SEGURANCA.md`](../Transferir%20para%20Servidor/servidor-lan/CHECKLIST-ETAPA15-SEGURANCA.md) | Bloqueio portas Supabase na LAN |
| [`server-manifest-contract.md`](./server-manifest-contract.md) | Contrato Acomp Server Manager |
