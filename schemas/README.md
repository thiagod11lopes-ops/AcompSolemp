# `server-manifest` — JSON Schema (Etapa 8)

| Arquivo | Função |
|---------|--------|
| `server-manifest.schema.json` | Contrato genérico (`$id` URN 1.0.0) |
| `validate-manifest.mjs` | Valida `../server-manifest.json` com AJV |
| `package.json` | Dependências locais (`ajv`, `ajv-cli`) |

## Validar localmente

```bash
cd schemas
npm ci
npm run validate
```

Equivalente com CLI:

```bash
npm run validate:cli
```

Validação semântica (paths de scripts no disco):  
`node "../Transferir para Servidor/servidor-lan/validar-server-manifest.mjs"`

Contrato completo: [`docs/server-manifest-contract.md`](../docs/server-manifest-contract.md).
