# Contrato `server-manifest` (preparação para Acomp Server Manager)

## Finalidade

O contrato permite que um **instalador externo** (futuro **Acomp Server Manager**, repositório separado) clone um repositório GitHub, leia **`server-manifest.json` na raiz do clone** e descubra **como** provisionar aquele sistema como servidor (requisitos, fases, scripts, portas, validação), **sem** embutir lógica de negócio da aplicação no Manager.

Cada **sistema** (ex.: AcompOPMS) versiona o **próprio** manifesto; o Manager versiona o **JSON Schema** de validação.

## Dois arquivos, duas responsabilidades

| Artefato | Onde vive hoje (AcompSolemp) | Versão atual | Papel |
|----------|-------------------------------|--------------|--------|
| **`server-manifest.json`** | Raiz do repositório da aplicação | **manifestVersion 1.2.0** | Dados de instalação **deste** sistema (scripts, plano, portas, LAN + overlay, perfil `backendProfile`, etc.). |
| **`server-manifest.schema.json`** | `schemas/` (cópia canônica futura no repo `acom-server-manager`) | **Schema document 1.0.0** | Regras **genéricas** de forma do JSON; não descreve AcompOPMS. |

O manifesto declara **`schemaVersion": "1.0.0"`** para indicar com qual revisão do schema foi escrito.

## Campo `$schema` no manifesto

Hoje o AcompSolemp usa:

```json
"$schema": "./schemas/server-manifest.schema.json"
```

- **Por quê relativo:** funciona offline, no clone e na validação local **sem** depender de URL publicada.
- **Por quê não usar HTTPS ainda:** apontar `$schema` para uma URL pública só é seguro **depois** que o repositório `acom-server-manager` existir e publicar o schema em release/tag estável. URL inexistente quebra editores e validadores que resolvem `$schema` pela rede.

**Depois da publicação do Manager (proposta, não ativa):**

1. Tag `schema-v1.0.0` (ou release equivalente) no repo `acom-server-manager`.
2. Manifestos podem passar a usar, **opcionalmente**, uma URL estável, por exemplo:  
   `https://raw.githubusercontent.com/<ORG>/acom-server-manager/schema-v1.0.0/schemas/server-manifest.schema.json`  
   (substituir `<ORG>` quando o repositório existir.)
3. O Manager deve **sempre** poder validar com schema **embutido ou em cache** na sua versão, não apenas via download.

## Como o futuro Manager deve validar

1. **Clone** (ou leitura) do repositório informado pelo usuário (URL GitHub).
2. Localizar **`server-manifest.json`** (caminho padrão: raiz; override futuro via `manager.manifestPath` no manifesto).
3. **Parse JSON**; falhar com erro claro se inválido.
4. **Validar** contra o JSON Schema cuja versão corresponde a `schemaVersion` do manifesto (tabela de compatibilidade embutida no Manager).
5. **Validação semântica** (responsabilidade do Manager, fora do schema):  
   - `scripts.items[].path` existem no clone;  
   - `scriptId` / `scriptIdByPlatform` referenciados existem;  
   - `installPlan.phases[].dependsOn` forma DAG;  
   - `manager.supportedPlatforms` inclui o SO atual;  
   - `manager.minManagerVersion` ≤ versão do Manager.
6. Só então executar **`installPlan`** (fora do escopo deste documento).

Ferramenta de referência (desenvolvimento, **Etapa 8**):

```bash
cd schemas && npm ci && npm run validate
node "Transferir para Servidor/servidor-lan/validar-server-manifest.mjs"
```

CI: job `validate-server-manifest` em `.github/workflows/ci.yml`.

## Versionamento futuro

| Tipo | Campo | Regra sugerida |
|------|--------|----------------|
| **Manifesto** | `manifestVersion` (semver) | Incremento **minor** para campos novos opcionais; **major** para remoções ou mudanças incompatíveis de fases/campos obrigatórios. |
| **Schema** | versão **1.0.0** no `$id` URN e na `description` | Publicado com o Manager; manifesto referencia via `schemaVersion`. |
| **Manager** | `manager.minManagerVersion` no manifesto | Manifesto exige versão mínima do instalador. |
| **Perfil de instalação** | `manager.backendProfile` + `installPlan.profile` | String opaca; interpretação no Manager (plugins), não no schema. |

Compatibilidade: Manager **N+1** deve validar manifestos `schemaVersion` suportados; manifesto **1.2.0** + schema **1.0.0** é o par atual do AcompOPMS.

## Runtime `server-connection.json` (Etapa 7)

Gerado por `Transferir para Servidor/servidor-lan/gerar-server-connection.mjs` e servido em **`/server-connection.json`** (mesma origem Caddy). Contém URLs LAN (`loginUrl`) e metadados overlay (desabilitado até Etapas 5–6). O Manager deve preferir este arquivo após instalação em vez de montar URL manualmente.

## Publicação do schema no repo `acom-server-manager` (proposta)

Quando o repositório independente existir:

| Item | Proposta |
|------|----------|
| Caminho canônico | `schemas/server-manifest.schema.json` |
| `$id` publicado (após release) | `https://raw.githubusercontent.com/<ORG>/acom-server-manager/<TAG>/schemas/server-manifest.schema.json` |
| `$id` até lá | `urn:acom-server-manager:server-manifest:schema:1.0.0` (não resolve HTTP) |
| Distribuição | Copiar schema no pacote/executable do Manager; opcional download da URL acima para verificação. |

Este repositório (AcompSolemp) **mantém uma cópia** em `schemas/` para desenvolvimento e CI da aplicação; a **fonte de verdade** do schema passa a ser o repo `acom-server-manager` quando criado (sync por tag, não duplicar lógica de instalação aqui).

## Identificador do schema (`$id`)

Atual no arquivo local:

```text
urn:acom-server-manager:server-manifest:schema:1.0.0
```

URN evita fingir que já há endpoint HTTPS. Após a primeira release pública, o `$id` HTTP pode ser adicionado **em paralelo** em releases do Manager (política a definir no repo do Manager).
