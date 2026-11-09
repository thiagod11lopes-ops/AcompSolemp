# Resolve itens do status do Dashboard (pre-reqs e servicos).
# Retorna hashtable serializavel: id, started, message, guidance.

function Get-DashboardInstaladoresDir {
  $root = Get-ServidorRoot
  $desktopPack = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Iniciar Servidor\instaladores'
  foreach ($c in @(
      (Join-Path (Split-Path $root -Parent) '..\instaladores'),
      (Join-Path (Split-Path $root -Parent) 'instaladores'),
      (Join-Path $root 'instaladores'),
      $desktopPack,
      (Join-Path $root '..\..\instaladores')
    )) {
    try {
      if ($c -and (Test-Path -LiteralPath $c)) {
        return (Resolve-Path -LiteralPath $c).Path
      }
    } catch { }
  }
  return $desktopPack
}

function Find-DashboardInstaller([string]$Pattern) {
  $dir = Get-DashboardInstaladoresDir
  if (-not $dir -or -not (Test-Path -LiteralPath $dir)) { return $null }
  return Get-ChildItem -LiteralPath $dir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $Pattern } |
    Select-Object -First 1 -ExpandProperty FullName
}

function Find-LiberarFirewallCmd {
  $root = Get-ServidorRoot
  foreach ($c in @(
      (Join-Path $root 'Liberar-Firewall.cmd'),
      (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Iniciar Servidor\Liberar-Firewall.cmd'),
      (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Iniciar Servidor\AcompSolemp\servidor-portatil\Liberar-Firewall.cmd')
    )) {
    try {
      if ($c -and (Test-Path -LiteralPath $c)) {
        return (Resolve-Path -LiteralPath $c).Path
      }
    } catch { }
  }
  return $null
}

function Find-DockerDesktopExe {
  foreach ($c in @(
      (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
      (Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe'),
      (Join-Path $env:LOCALAPPDATA 'Docker\Docker\Docker Desktop.exe')
    )) {
    if ($c -and (Test-Path -LiteralPath $c)) { return $c }
  }
  return $null
}

function Start-DashboardInstaller([string]$Path, [string]$Nome) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) {
    $dir = Get-DashboardInstaladoresDir
    return @{
      started  = $false
      message  = "Instalador de $Nome nao encontrado."
      guidance = @"
Nao achei o instalador de $Nome.

Coloque o arquivo na pasta de instaladores:
$dir

Padroes esperados:
- Docker: Docker*Installer*.exe
- Node.js: node-*.msi
- Visual C++: vc_redist*.exe
- WSL: wsl_update*.msi

Depois clique de novo em Solucionar problemas.
"@.Trim()
    }
  }
  try {
    Start-Process -FilePath $Path | Out-Null
    return @{
      started  = $true
      message  = "Instalador de $Nome aberto."
      guidance = @"
O instalador de $Nome foi aberto.

1. Conclua a instalacao na janela que apareceu (Next/Instalar/OK).
2. Se pedir reiniciar o PC, reinicie.
3. Volte ao Dashboard e clique em Atualizar.

Se a janela nao abriu, rode o arquivo manualmente:
$Path
"@.Trim()
    }
  } catch {
    return @{
      started  = $false
      message  = "Falha ao abrir instalador de $Nome."
      guidance = ("Erro: {0}`n`nTente abrir manualmente:`n{1}" -f $_.Exception.Message, $Path)
    }
  }
}

function Invoke-DashboardFixCheck([string]$Id) {
  $id = ("$Id").Trim().ToLowerInvariant()
  if (-not $id) {
    return @{
      id       = ''
      started  = $false
      message  = 'Informe o item a corrigir.'
      guidance = 'Clique em Solucionar problemas em um item vermelho do modal de status.'
    }
  }

  switch ($id) {
    'docker' {
      if (Test-DockerRunning) {
        return @{
          id = $id; started = $false; message = 'Docker ja esta pronto.'
          guidance = 'Docker Desktop ja responde. Clique em Atualizar no Dashboard.'
        }
      }
      $exe = Find-DockerDesktopExe
      if ($exe) {
        try {
          Start-Process -FilePath $exe | Out-Null
          return @{
            id = $id; started = $true
            message = 'Docker Desktop sendo aberto.'
            guidance = @"
O Docker Desktop foi iniciado.

1. Espere o icone da baleia ficar estavel (status Running / Engine running).
2. Isso pode levar 1 a 5 minutos na primeira vez.
3. Clique em Atualizar no Dashboard ate o item ficar verde.

Se nao abrir, inicie manualmente pelo menu Iniciar: Docker Desktop.
"@.Trim()
          }
        } catch {
          return @{
            id = $id; started = $false
            message = 'Nao foi possivel abrir o Docker Desktop.'
            guidance = ("Erro: {0}`n`nAbra manualmente: {1}" -f $_.Exception.Message, $exe)
          }
        }
      }
      $r = Start-DashboardInstaller (Find-DashboardInstaller 'Docker*Installer*.exe') 'Docker Desktop'
      $r.id = $id
      return $r
    }

    'node' {
      if (Test-NodeInstalled) {
        return @{
          id = $id; started = $false; message = 'Node.js ja instalado.'
          guidance = 'Node.js ja esta no PATH. Clique em Atualizar. Se ainda falhar, abra um novo terminal e reinicie o Dashboard.'
        }
      }
      $r = Start-DashboardInstaller (Find-DashboardInstaller 'node-*.msi') 'Node.js'
      $r.id = $id
      return $r
    }

    'vcredist' {
      if (Test-VcRedistInstalled) {
        return @{
          id = $id; started = $false; message = 'Visual C++ ja instalado.'
          guidance = 'Runtime ja detectado. Clique em Atualizar.'
        }
      }
      $r = Start-DashboardInstaller (Find-DashboardInstaller 'vc_redist*.exe') 'Visual C++ Redistributable'
      $r.id = $id
      return $r
    }

    'wsl' {
      if (Test-WslInstalled) {
        return @{
          id = $id; started = $false; message = 'WSL ja detectado.'
          guidance = 'WSL ja responde. Clique em Atualizar.'
        }
      }
      $msi = Find-DashboardInstaller 'wsl_update*.msi'
      if ($msi) {
        $r = Start-DashboardInstaller $msi 'WSL'
        $r.id = $id
        return $r
      }
      try {
        Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
          '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
          'wsl --install; pause'
        ) | Out-Null
        return @{
          id = $id; started = $true
          message = 'Instalacao do WSL iniciada (Admin).'
          guidance = @"
Foi aberta uma janela elevada para instalar o WSL.

1. Confirme o UAC (Sim).
2. Aguarde o comando terminar.
3. Reinicie o PC se o Windows pedir.
4. Abra o Docker Desktop depois do reinicio.
5. Volte ao Dashboard e clique em Atualizar.

Se preferir, no PowerShell (Admin):
wsl --install
"@.Trim()
        }
      } catch {
        return @{
          id = $id; started = $false
          message = 'Nao foi possivel iniciar a instalacao do WSL.'
          guidance = @"
O WSL e necessario para o Docker Desktop.

Opcao 1 — PowerShell como Administrador:
wsl --install

Opcao 2 — coloque wsl_update*.msi na pasta instaladores e clique de novo.

Erro: $($_.Exception.Message)
"@.Trim()
        }
      }
    }

    'pastas' {
      $cfg = $null
      try { $cfg = Import-ServidorConfig } catch { }
      $fe = if ($cfg) { [string]$cfg.FRONTEND_DIR } else { '' }
      $sb = if ($cfg) { [string]$cfg.SUPABASE_DOCKER_DIR } else { '' }
      $miss = @()
      if (-not $fe -or -not (Test-Path -LiteralPath $fe)) { $miss += "frontend: $(if ($fe) { $fe } else { '(FRONTEND_DIR vazio no config.env)' })" }
      if (-not $sb -or -not (Test-Path -LiteralPath $sb)) { $miss += "supabase: $(if ($sb) { $sb } else { '(SUPABASE_DOCKER_DIR vazio no config.env)' })" }
      $cfgPath = Join-Path (Get-ServidorRoot) 'config.env'
      return @{
        id = $id; started = $false
        message = 'Pastas nao podem ser recriadas automaticamente.'
        guidance = @"
Este item depende das pastas do pacote no disco.

Faltando:
$($miss -join "`n")

O que fazer:
1. Confira se o pacote "Iniciar Servidor" esta completo (AcompSolemp\frontend e supabase-master\docker).
2. Ajuste os caminhos em:
$cfgPath
   FRONTEND_DIR=...
   SUPABASE_DOCKER_DIR=...
3. Salve o arquivo e clique em Atualizar no Dashboard.
"@.Trim()
      }
    }

    'firewall' {
      $cmd = Find-LiberarFirewallCmd
      if (-not $cmd) {
        $root = Get-ServidorRoot
        return @{
          id = $id; started = $false
          message = 'Liberar-Firewall.cmd nao encontrado.'
          guidance = @"
Nao achei Liberar-Firewall.cmd.

Procure o arquivo em:
- $root\Liberar-Firewall.cmd
- Area de Trabalho\Iniciar Servidor\Liberar-Firewall.cmd

Clique com o botao direito > Executar como administrador.
Isso cria regras de firewall, hosts e prepara https://sistema.acompomps.rede/
"@.Trim()
        }
      }
      try {
        Start-Process -FilePath $cmd -Verb RunAs | Out-Null
        return @{
          id = $id; started = $true
          message = 'Liberar Firewall iniciado (Admin).'
          guidance = @"
Foi aberto o Liberar Firewall com pedido de Administrador.

1. Confirme o UAC (Sim).
2. Espere a janela preta concluir (regras, hosts, gateway).
3. Clique em Atualizar no Dashboard.
4. Se o item Firewall ficar verde mas os servicos nao, use Solucionar nos servicos (Iniciar servidor).

Arquivo:
$cmd
"@.Trim()
        }
      } catch {
        return @{
          id = $id; started = $false
          message = 'Falha ao abrir Liberar Firewall.'
          guidance = ("Erro: {0}`n`nExecute manualmente como Administrador:`n{1}" -f $_.Exception.Message, $cmd)
        }
      }
    }

    { $_ -in @('gateway', 'vite', 'supabase', 'authgw') } {
      try {
        if (Get-Command Start-OmpsServerJob -ErrorAction SilentlyContinue) {
          $snap = Start-OmpsServerJob -Action start
          return @{
            id = $id; started = $true
            message = 'Inicio do servidor acionado.'
            guidance = @"
O fluxo de iniciar o servidor foi disparado (mesmo do botao Iniciar).

1. Se aparecer o painel de status, confira os itens e avance.
2. Aguarde os servicos subirem (pode levar alguns minutos).
3. Clique em Atualizar no Dashboard ate Gateway, Vite, Supabase e Auth ficarem verdes.

Status: $($snap.status) — $($snap.message)
"@.Trim()
          }
        }
        $abrir = Join-Path (Get-ServidorRoot) 'scripts\Abrir-Tudo.ps1'
        if (-not (Test-Path -LiteralPath $abrir)) {
          throw "Script nao encontrado: $abrir"
        }
        Start-Process -FilePath 'powershell.exe' -ArgumentList @(
          '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', $abrir
        ) -WindowStyle Normal | Out-Null
        return @{
          id = $id; started = $true
          message = 'Abrir-Tudo.ps1 iniciado.'
          guidance = 'O servidor esta sendo iniciado. Aguarde e clique em Atualizar no Dashboard.'
        }
      } catch {
        return @{
          id = $id; started = $false
          message = 'Nao foi possivel iniciar o servidor.'
          guidance = @"
Erro: $($_.Exception.Message)

Tente pelo botao Iniciar servidor no topo do Dashboard,
ou rode Iniciar Servidor OMPS / Abrir-Tudo.ps1.

Confira tambem se Docker Desktop esta verde antes.
"@.Trim()
        }
      }
    }

    default {
      return @{
        id = $id; started = $false
        message = "Item desconhecido: $id"
        guidance = 'Atualize o Dashboard e tente de novo. Se o problema continuar, use o painel Iniciar Servidor.'
      }
    }
  }
}
