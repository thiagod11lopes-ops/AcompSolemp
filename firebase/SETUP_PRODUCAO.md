# Firebase — modo produção (AcompSolemp)

Guia para ativar Firestore em **modo produção** com login **Google** (gestor) e **e-mail/senha** (timeline).

## 1. Firebase Console

Projeto: **acompsolemp** — [console.firebase.google.com](https://console.firebase.google.com)

### Authentication → Sign-in method

1. Abra **Authentication** → **Sign-in method** (Método de login)
2. Ative **Google**
3. Clique em **Adicionar novo provedor** (botão acima da tabela, se só o Google aparecer)
4. Ative **E-mail/senha** (Email/Password) — necessário para usuários da Timeline
5. Informe um e-mail de suporte do projeto e salve

> **Não é necessário** ativar login Anônimo. A timeline usa contas internas `{tenantId}.{login}@portal.acompsolemp.app`.

### Authentication → Settings → Authorized domains

Confirme que estão listados:

- `localhost` (desenvolvimento)
- `thiagod11lopes-ops.github.io` (GitHub Pages)
- Seu domínio customizado, se houver

### Firestore Database

1. **Create database**
2. Escolha **Production mode** (não use modo teste em produção)
3. Região: `southamerica-east1` (São Paulo) ou a mais próxima dos usuários
4. Após criar, vá em **Rules** e publique as regras do arquivo `firebase/firestore.rules`

Ou via CLI (na raiz do repositório):

```bash
npm install -g firebase-tools
firebase login
firebase use acompsolemp
firebase deploy --only firestore:rules
```

## 2. Variáveis de ambiente (`frontend/.env`)

```env
VITE_DATA_SOURCE=firebase

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=acompsolemp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=acompsolemp
VITE_FIREBASE_STORAGE_BUCKET=acompsolemp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_APP_STATE_DOC=appState/current
```

Reinicie o servidor de desenvolvimento após alterar o `.env`.

## 3. Modelo multi-tenant

| Quem | Como entra | Dados |
|------|------------|-------|
| **Gestor geral** | Google em `/login` | Cria organização no 1º acesso; `tenantId` = UID Google |
| **Clínica, auditoria, IMH…** | Código da org + nome/senha na Timeline | Sem Google; conta Firebase interna automática |

O gestor compartilha o **código da organização** (em Cadastros) com a equipe.

## 4. Primeiro acesso em produção

1. Gestor faz login com Google em `/login`
2. O app cria o tenant e o código da organização
3. Em **Cadastros**, cadastre clínicas e usuários (nome + senha)
4. Cada cadastro cria automaticamente a conta Firebase da timeline
5. Usuários entram na Timeline com código + credenciais

### Armazenamento em produção (`VITE_DATA_SOURCE=firebase`)

| Dado | Onde fica |
|------|-----------|
| Pedidos, usuários, clínicas, etc. | **Firestore** (`tenants/{tenantId}/appState/current`) |
| Código da org + lista de clínicas | **Firestore** (`orgCodes/{code}`) |
| Sessão de login (portal) | IndexedDB (leve, só auth) |
| Tema claro/escuro | IndexedDB (preferência de UI) |

## 5. Segurança

- Não commite `frontend/.env`
- Modo produção **bloqueia** leitura/escrita sem login Firebase
- Gestor acessa pelo UID Google; timeline acessa só o tenant do código informado

## 6. Desenvolvimento local

Para testar sem Firebase:

```env
VITE_DATA_SOURCE=local
```

Login e senha mock continuam funcionando normalmente.

## 7. GitHub Pages (produção online)

URL: https://thiagod11lopes-ops.github.io/AcompSolemp/

No repositório GitHub → **Settings** → **Secrets and variables** → **Actions**, crie estes secrets (mesmos valores do `frontend/.env`):

| Secret | Exemplo |
|--------|---------|
| `VITE_DATA_SOURCE` | `firebase` |
| `VITE_FIREBASE_API_KEY` | (Firebase Console) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `acompsolemp.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `acompsolemp` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `acompsolemp.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (Firebase Console) |
| `VITE_FIREBASE_APP_ID` | (Firebase Console) |
| `VITE_FIREBASE_APP_STATE_DOC` | `appState/current` |

Após salvar os secrets, faça push em `main` ou execute o workflow **Deploy GitHub Pages** manualmente.

Teste o login em: https://thiagod11lopes-ops.github.io/AcompSolemp/login
