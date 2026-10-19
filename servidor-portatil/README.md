# Servidor portátil — AcompOPMS (Windows)

Pacote para rodar o **AcompSolemp + Supabase local** nesta máquina Windows e **levar tudo para outro PC** com o mínimo de dor.

## Ideia

| Peça | Onde fica | Portátil? |
|------|-----------|-----------|
| Dados do banco | `supabase-master\docker\volumes\db\data` | Sim (pasta no disco) |
| Secrets Supabase | `supabase-master\docker\.env` | Sim |
| App React | `AcompSolemp\frontend` | Sim |
| IP da rede | `servidor-portatil\config.env` + `server-config.js` | Ajustável sem rebuild |

O outro computador só precisa do navegador: `http://IP_DO_SERVIDOR:5173`.

---

## Uso diário (máquina servidor)

1. Abra o **Docker Desktop** e espere ficar Running.
2. **Jeito mais fácil:** dê duplo clique em `servidor-portatil\Iniciar-Servidor.cmd`

Ou no PowerShell (se aparecer erro de “execução de scripts desabilitada”, use a linha com `-ExecutionPolicy Bypass`):

```powershell
cd C:\Users\User\Desktop\Thiago\Projetos\AcompSolemp\servidor-portatil\scripts
powershell -ExecutionPolicy Bypass -File .\Iniciar-Servidor.ps1
```

3. No outro PC (mesma rede): `http://192.168.0.17:5173`  
   (troque pelo IP atual — veja `.\Detectar-IP.ps1`)

Para parar:

```powershell
.\Parar-Servidor.ps1
```

Modo mais “produção” (build + nginx):

```powershell
.\Iniciar-Servidor.ps1 -Build
```

---

## IP fixo do servidor (obrigatório com vários usuários)

Hoje o roteador pode mudar o IP. Para **nunca mudar**, fixe o IP neste PC.

1. Duplo clique em `servidor-portatil\Fixar-IP.cmd` (aceite o aviso de Administrador)  
   ou, no PowerShell **como Administrador**:

```powershell
cd C:\Users\User\Desktop\Thiago\Projetos\AcompSolemp\servidor-portatil\scripts
powershell -ExecutionPolicy Bypass -File .\Fixar-IP.ps1
```

Isso fixa o IP atual da rede: **192.168.1.202**.

2. Depois alinhe o AcompOPMS:

```powershell
powershell -ExecutionPolicy Bypass -File .\Aplicar-Host.ps1 -HostAddress 192.168.1.202
powershell -ExecutionPolicy Bypass -File .\Parar-Servidor.ps1
powershell -ExecutionPolicy Bypass -File .\Iniciar-Servidor.ps1
```

3. (Recomendado no roteador) Reserve o IP `192.168.1.202` para o MAC deste PC (DHCP reservation), para nenhum outro aparelho pegar o mesmo número.

Os usuários passam a usar sempre: `http://192.168.1.202:5173`

## Se o IP da rede mudar

```powershell
.\Detectar-IP.ps1
.\Aplicar-Host.ps1 -HostAddress NOVO_IP
.\Parar-Servidor.ps1
.\Iniciar-Servidor.ps1
```

Não precisa rebuild: o app lê `frontend\public\server-config.js` em tempo de execução.

---

## Migrar para outro Windows (checklist)

### No PC antigo (servidor atual)

1. `.\Backup-Servidor.ps1` → gera zip em `servidor-portatil\backups\`
2. Copie para um HD/USB (ou rede):
   - pasta `AcompSolemp` (projeto inteiro)
   - pasta `supabase-master` (ou pelo menos `supabase-master\docker`)
   - o zip de backup (recomendado — garante dados consistentes)

### No PC novo

1. Instale **Docker Desktop** + **Node.js 22+**
2. Cole as pastas nos mesmos caminhos **ou** atualize `servidor-portatil\config.env`:
   - `SUPABASE_DOCKER_DIR=...`
   - `FRONTEND_DIR=...`
3. `.\Detectar-IP.ps1` → anote o IP novo
4. `.\Restaurar-Servidor.ps1 -Zip ".\backups\acomp-servidor-....zip" -HostAddress IP_NOVO`
5. No cliente da rede: abrir `http://IP_NOVO:5173`

### Atalho sem zip (só copiar pastas)

Se parar o Docker antes de copiar, pode copiar `docker\volumes\db\data` junto. Ainda assim o **Backup-Servidor.ps1** é mais seguro.

---

## Firewall

Os scripts tentam liberar as portas `5173` e `8000`. Se o outro PC não conectar, rode o PowerShell **como Administrador** e execute de novo `Iniciar-Servidor.ps1`, ou libere TCP 5173/8000 no Firewall do Windows.

---

## Segurança (rede local)

- Studio em `:8000` tem senha básica (`config.env`)
- Troque senhas do `supabase-master\docker\.env` antes de uso real
- Não exponha essas portas na internet sem HTTPS/VPN

---

## Arquivos importantes

```
servidor-portatil/
  config.env              ← IP e caminhos deste PC
  config.env.example
  docker-compose.frontend.yml
  nginx/default.conf
  scripts/
    Iniciar-Servidor.ps1
    Parar-Servidor.ps1
    Aplicar-Host.ps1
    Detectar-IP.ps1
    Backup-Servidor.ps1
    Restaurar-Servidor.ps1
  backups/                ← zips gerados (não versionar)
```
