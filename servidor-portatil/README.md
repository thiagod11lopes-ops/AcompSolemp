# Servidor portátil — AcompOPMS (Windows)

Pacote para rodar o **AcompSolemp + Supabase local** nesta máquina Windows e **levar tudo para outro PC** com o mínimo de dor.

## Começar aqui (recomendado)

1. Na Área de Trabalho: ícone **`AcompOPMS Instalar`** (abre o instalador com opções Servidor / Cliente).
2. Ou, na pasta do pacote / **Transferir Servidor**: **`AcompOPMS Instalar.vbs`**.

**Para enviar a outro PC:** copie a pasta inteira **Transferir Servidor** (com `Gereal`). No destino, clique no mesmo **`AcompOPMS Instalar`** e escolha Servidor ou Cliente. O `.lnk` pode precisar ser recriado lá; o `.vbs` viaja com a pasta e funciona.

| Este PC… | Escolha no hub | O que faz |
|----------|----------------|-----------|
| **É o servidor** (hospeda o sistema) | **Instalar servidor** | Dependências, firewall/HTTPS, sobe Docker+app, instala a CA neste PC, health-check e Dashboard |
| **Só acessa o sistema** | **Instalar neste PC** | Informa o endereço do servidor, instala a CA (UAC), hosts se precisar, atalho e abre HTTPS sem aviso |

- **1ª vez no servidor:** `Iniciar AcompOPMS` → Servidor → ao final use `https://IP/` (ou o nome amigável).
- **Nos outros PCs:** copie a pasta `cliente` (ou abra a URL da CA do servidor) → rode o mesmo hub → Cliente → informe o IP/nome do servidor.

Atalhos técnicos (`Iniciar Servidor OMPS.vbs`, `Instalacao-do-Servidor.vbs`) continuam na pasta do pacote; o hub é o ponto de entrada recomendado.

## Ideia

| Peça | Onde fica | Portátil? |
|------|-----------|-----------|
| Dados do banco | `supabase-master\docker\volumes\db\data` | Sim (pasta no disco) |
| Secrets Supabase | `supabase-master\docker\.env` | Sim |
| App React | `AcompSolemp\frontend` | Sim |
| IP da rede | `servidor-portatil\config.env` + `server-config.js` | Ajustável sem rebuild |

Nos clientes, após o assistente: `https://IP_DO_SERVIDOR/` (HTTPS com CA confiável).

---

## Uso diário (máquina servidor)

1. Abra a pasta `servidor-portatil`
2. Prefira **`Iniciar AcompOPMS`** (hub) ou o atalho Desktop; para só subir de novo, use **Iniciar Servidor OMPS**  
   - **1ª vez** (ou após interromper): checklist + IP atual + campo do endereço amigável  
   - **Próximas vezes** (automático): cronômetro 60 s com **Pausar** / Interromper / Iniciar agora + IP + endereço amigável  
   - Depois sobe Docker + app e abre o Chrome em `/login`

Se o atalho `.lnk` sumir ou for copiado para outro PC, rode uma vez:

```powershell
cd ...\servidor-portatil\scripts
powershell -ExecutionPolicy Bypass -File .\Criar-Atalho-Iniciar.ps1
powershell -ExecutionPolicy Bypass -File .\Criar-Atalho-Desktop.ps1 -Name "AcompOPMS" -TargetPath "..\Iniciar AcompOPMS.vbs"
```

Ou use o arquivo `Iniciar Servidor OMPS.vbs` (mesmo efeito de subir o servidor).

Nos outros PCs, use o hub → **Cliente**, ou digite **exatamente** o nome cadastrado (sem `http://` e sem porta), por exemplo:

`sistema.acompomps.rede`

1. Neste PC servidor, **uma vez**: fluxo Servidor do hub (ou `Liberar-Firewall.cmd` Admin).  
2. No roteador (só na instalação): DNS primário = IP deste servidor.  
Usuários finais: hub Cliente uma vez, depois só o atalho Desktop.

Para parar: duplo clique em `Parar-Servidor.cmd`

### Início automático (ligar o PC e já servir)

1. Duplo clique em `Instalar-Inicio-Automatico.cmd` (uma vez)
2. Reinicie o PC ou faça logoff/login  

O Windows sobe o Docker + Supabase + app ~90 s após o login e abre o **Chrome** em  
`http://127.0.0.1:5173/login` quando o app estiver pronto.  
Log: `servidor-portatil\logs\iniciar-auto.log`  
Para desligar o automático: `Remover-Inicio-Automatico.cmd`

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
.\Aplicar-Host.ps1 -HostAddress 192.168.1.202
.\Parar-Servidor.ps1
.\Iniciar-Servidor.ps1
```

(Troque `192.168.1.202` pelo IP numérico que o `Detectar-IP.ps1` mostrar.)

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
3. `.\Detectar-IP.ps1` → anote o IP numérico (ex.: `192.168.1.50`)
4. `.\Restaurar-Servidor.ps1 -Zip ".\backups\acomp-servidor-....zip" -HostAddress 192.168.1.50`
5. No cliente da rede: abrir `http://192.168.1.50:5173` (só números, sem palavras)

### Atalho sem zip (só copiar pastas)

Se parar o Docker antes de copiar, pode copiar `docker\volumes\db\data` junto. Ainda assim o **Backup-Servidor.ps1** é mais seguro.

---

## Firewall

Se o outro PC não abrir `http://192.168.1.202:5173`, dê **duplo clique** (uma vez) em `Liberar-Firewall.cmd` e aceite o aviso de Administrador. Isso libera as portas `5173` e `8000` na rede local.

---

## Segurança (rede local)

- Studio em `:8000` tem senha básica (`config.env`)
- Troque senhas do `supabase-master\docker\.env` antes de uso real
- Não exponha essas portas na internet sem HTTPS/VPN

---

## Arquivos importantes

```
servidor-portatil/
  Iniciar Servidor OMPS.lnk   ← ícone de uso diário (duplo clique)
  Iniciar Servidor OMPS.vbs   ← mesmo fluxo (portátil)
  icons/opms.ico
  config.env              ← IP e caminhos deste PC
  config.env.example
  docker-compose.frontend.yml
  nginx/default.conf
  scripts/
    Abrir-Tudo.ps1
    Criar-Atalho-Iniciar.ps1
    Iniciar-Servidor.ps1
    Parar-Servidor.ps1
    Aplicar-Host.ps1
    Detectar-IP.ps1
    Backup-Servidor.ps1
    Restaurar-Servidor.ps1
  backups/                ← zips gerados (não versionar)
```
