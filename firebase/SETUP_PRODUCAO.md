# Firebase — modo produção (AcompSolemp)

Guia para ativar Firestore em **modo produção** com login **Google**.

## 1. Firebase Console

Projeto: **acompsolemp** — [console.firebase.google.com](https://console.firebase.google.com)

### Authentication → Sign-in method

1. Abra **Authentication** → **Sign-in method**
2. Ative **Google**
3. Informe um e-mail de suporte do projeto
4. Salve

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

# Mesmo e-mail da conta Google usada no login
VITE_GESTOR_GOOGLE_EMAIL=seu.email@gmail.com

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=acompsolemp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=acompsolemp
VITE_FIREBASE_STORAGE_BUCKET=acompsolemp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_APP_STATE_DOC=appState/current
```

Reinicie o servidor de desenvolvimento após alterar o `.env`.

## 3. Cadastrar e-mails Google (obrigatório)

**Antes** de `VITE_DATA_SOURCE=firebase`, com o app ainda em modo local:

1. Entre como gestor (`gestor` / `gestor123`)
2. Vá em **Gestor → Cadastros → Usuários**
3. No painel **E-mails Google — Administradores**, cadastre o e-mail de cada gestor/admin
4. Para clínicas e ordenadores, ao cadastrar usuário informe o campo **E-mail Google**

Em produção, só entram contas cujo e-mail está cadastrado no sistema.

## 4. Primeiro acesso em produção

1. Firestore vazio + regras exigindo `request.auth != null`
2. Usuário faz login com Google (gestor)
3. O app carrega dados da nuvem (`appState/current`); se vazio, usa estrutura inicial em memória
4. Cada alteração grava **somente no Firestore** — AppData não é mais salvo no IndexedDB
5. Demais usuários recebem os mesmos dados após autenticação

### Armazenamento em produção (`VITE_DATA_SOURCE=firebase`)

| Dado | Onde fica |
|------|-----------|
| Pedidos, usuários, clínicas, etc. | **Firestore** (`appState/current`) |
| Cache em memória | Sessão do navegador (não persiste ao fechar) |
| Sessão de login (portal) | IndexedDB (leve, só auth) |
| Tema claro/escuro | IndexedDB (preferência de UI) |

## 5. Segurança

- Não commite `frontend/.env`
- Modo produção **bloqueia** leitura/escrita sem login Firebase
- Refine regras por perfil/clínica na fase 2 (coleções separadas)

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
| `VITE_GESTOR_GOOGLE_EMAIL` | seu e-mail Google |
| `VITE_FIREBASE_API_KEY` | (Firebase Console) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `acompsolemp.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `acompsolemp` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `acompsolemp.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (Firebase Console) |
| `VITE_FIREBASE_APP_ID` | (Firebase Console) |
| `VITE_FIREBASE_APP_STATE_DOC` | `appState/current` |

Após salvar os secrets, faça push em `main` ou execute o workflow **Deploy GitHub Pages** manualmente.

Teste o login em: https://thiagod11lopes-ops.github.io/AcompSolemp/login
