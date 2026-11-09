# Aplica novo SERVER_ALIAS e resolve rede/HTTPS/DNS/gateway/Supabase.
# Atualiza state\network-alias-job.json para o Dashboard acompanhar em tempo real.
# Uso: .\Aplicar-Network-Alias.ps1 -Alias acompomps.marinha

param(
  [Parameter(Mandatory = $true)]
  [string]$Alias
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$root = Get-ServidorRoot
$stateDir = Join-Path $root 'state'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$statePath = Join-Path $stateDir 'network-alias-job.json'

$alias = Normalize-AliasInput $Alias
if (-not $alias -or $alias.Length -lt 3) {
  throw 'Informe um endereco valido (ex.: sistema.acompomps.rede).'
}
if ($alias -notmatch '^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$') {
  throw 'Use apenas letras, numeros, ponto e hifen (sem http:// ou porta).'
}

$stepDefs = @(
  @{
    id    = 'aplicar-host'
    label = 'Aplicar-Host (config, hosts local, URLs do app/Supabase)'
  },
  @{
    id    = 'preparar-https'
    label = 'Preparar-Https (gerar cert com o novo alias + IP)'
  },
  @{
    id    = 'reiniciar-gateway'
    label = 'Reiniciar o gateway (passar a usar o cert novo)'
  },
  @{
    id    = 'dns-local'
    label = 'Atualizar DNS local do alias (porta 53), se estiver ativo'
  },
  @{
    id    = 'supabase-url'
    label = 'Recriar/reiniciar servicos Supabase que dependem da URL publica'
  }
)

function New-Steps {
  @(
    foreach ($d in $stepDefs) {
      [ordered]@{
        id     = [string]$d.id
        label  = [string]$d.label
        status = 'pending'
        detail = ''
      }
    }
  )
}

function Save-JobState(
  [string]$Status,
  [string]$Message,
  $Steps,
  [string]$Ip = ''
) {
  $payload = [ordered]@{
    status    = $Status
    alias     = $alias
    ip        = $Ip
    message   = $Message
    updatedAt = (Get-Date).ToString('o')
    pid       = $PID
    steps     = @($Steps)
  }
  ($payload | ConvertTo-Json -Depth 6 -Compress) | Set-Content -LiteralPath $statePath -Encoding UTF8
}

function Set-Step($Steps, [string]$Id, [string]$Status, [string]$Detail = '') {
  foreach ($s in $Steps) {
    if ([string]$s.id -eq $Id) {
      $s.status = $Status
      $s.detail = $Detail
      break
    }
  }
}

function Get-CurrentIp {
  try {
    $cfg = Import-ServidorConfig
    $ip = [string]$cfg.SERVER_HOST
    if ($ip) { return $ip }
  } catch { }
  try {
    $detected = Get-PreferredLanIPv4
    if ($detected) { return [string]$detected }
  } catch { }
  return ''
}

$steps = New-Steps
$ip = Get-CurrentIp
Save-JobState 'running' 'Iniciando aplicacao do novo endereco…' $steps $ip

try {
  # 1) Aplicar-Host
  Set-Step $steps 'aplicar-host' 'running' 'Gravando alias, hosts e URLs…'
  Save-JobState 'running' 'Aplicando host/alias…' $steps $ip
  & (Join-Path $PSScriptRoot 'Aplicar-Host.ps1') -Alias $alias
  $cfg = Import-ServidorConfig
  $alias = Normalize-AliasInput ([string]$cfg.SERVER_ALIAS)
  $ip = [string]$cfg.SERVER_HOST

  # hosts e obrigatorio neste PC; se falhou sem Admin, pede UAC.
  if (-not (Test-AcompOmpsHostsAlias -Alias $alias -Ip $ip)) {
    Set-Step $steps 'aplicar-host' 'running' 'hosts exige Admin — confirme o UAC…'
    Save-JobState 'running' 'Atualizando arquivo hosts (UAC)…' $steps $ip
    $hostsFix = Set-AcompOmpsHostsAlias -Ip $ip -Alias $alias -AllowElevate
    if (-not $hostsFix.ok) {
      throw ("Nao foi possivel gravar hosts para {0}. Sem isso Gateway/Auth ficam offline no Dashboard. Erro: {1}" -f $alias, $hostsFix.error)
    }
  }
  Set-Step $steps 'aplicar-host' 'ok' "Alias $alias · IP $ip · hosts OK"
  Save-JobState 'running' 'Host/alias aplicados.' $steps $ip

  # 2) Preparar-Https
  Set-Step $steps 'preparar-https' 'running' 'Gerando certificado TLS…'
  Save-JobState 'running' 'Preparando HTTPS…' $steps $ip
  & (Join-Path $PSScriptRoot 'Preparar-Https.ps1')
  $namesFile = Join-Path $root 'certs\cert-names.txt'
  $namesDetail = if (Test-Path -LiteralPath $namesFile) {
    (Get-Content -LiteralPath $namesFile -Raw).Trim()
  } else {
    'Certificado gerado'
  }
  Set-Step $steps 'preparar-https' 'ok' $namesDetail
  Save-JobState 'running' 'Certificado HTTPS pronto.' $steps $ip

  # 3) Reiniciar gateway
  Set-Step $steps 'reiniciar-gateway' 'running' 'Recriando container acomp-gateway…'
  Save-JobState 'running' 'Reiniciando gateway HTTPS…' $steps $ip
  $compose = Join-Path $root 'docker-compose.gateway.yml'
  if (-not (Test-Path -LiteralPath $compose)) {
    throw "Compose do gateway nao encontrado: $compose"
  }
  Assert-DockerRunning
  Push-Location $root
  try {
    docker compose -f $compose up -d --force-recreate
    if ($LASTEXITCODE -ne 0) {
      throw 'Falha ao recriar o gateway (portas 80/443).'
    }
  } finally {
    Pop-Location
  }
  Start-Sleep -Seconds 2
  # Confirma HTTPS no nome novo (mesmo check do Dashboard).
  $gwCode = 0
  try {
    $gwCode = [int](& curl.exe -sk -o NUL -w '%{http_code}' --max-time 5 "https://${alias}/login" 2>$null)
  } catch { $gwCode = 0 }
  if ($gwCode -lt 200 -or $gwCode -ge 400) {
    Set-Step $steps 'reiniciar-gateway' 'warn' ("Gateway no ar, mas https://{0}/login retornou {1}. Verifique hosts/DNS." -f $alias, $gwCode)
  } else {
    Set-Step $steps 'reiniciar-gateway' 'ok' "Gateway OK (HTTPS $gwCode) em https://$alias"
  }
  Save-JobState 'running' 'Gateway reiniciado.' $steps $ip

  # 4) DNS local (opcional para outros PCs; este PC usa hosts)
  Set-Step $steps 'dns-local' 'running' 'Atualizando resolvedor local…'
  Save-JobState 'running' 'Atualizando DNS local…' $steps $ip
  $dnsScript = Join-Path $PSScriptRoot 'Dns-Alias-Servidor.ps1'
  if (-not (Test-Path -LiteralPath $dnsScript)) {
    Set-Step $steps 'dns-local' 'warn' 'Script DNS nao encontrado; neste PC o hosts ja resolve o nome'
  } else {
    try {
      & $dnsScript
      Set-Step $steps 'dns-local' 'ok' "DNS local aponta $alias -> $ip"
    } catch {
      $short = ([string]$_.Exception.Message) -replace '\s+', ' '
      if ($short.Length -gt 160) { $short = $short.Substring(0, 157) + '…' }
      Set-Step $steps 'dns-local' 'warn' ("DNS na porta 53 indisponivel ($short). Neste PC o hosts ja resolve $alias." )
    }
  }
  Save-JobState 'running' 'DNS local tratado.' $steps $ip

  # 5) Supabase (URL publica no .env)
  Set-Step $steps 'supabase-url' 'running' 'Recriando servicos com a URL nova…'
  Save-JobState 'running' 'Alinhando Supabase a URL publica…' $steps $ip
  $dockerDir = [string]$cfg.SUPABASE_DOCKER_DIR
  if (-not $dockerDir -or -not (Test-Path -LiteralPath $dockerDir)) {
    Set-Step $steps 'supabase-url' 'warn' 'Pasta Supabase nao encontrada; URLs ja gravadas no .env'
  } else {
    try {
      Assert-DockerRunning
      Push-Location $dockerDir
      try {
        $allSvcs = @()
        try {
          $allSvcs = @(docker compose config --services 2>$null | Where-Object { $_ })
        } catch { $allSvcs = @() }
        $targets = @(
          $allSvcs | Where-Object {
            $_ -match '(?i)^(kong|auth|rest|realtime|storage|studio|meta|analytics|supavisor)$' -or
            $_ -match '(?i)kong|auth|rest|realtime|storage'
          }
        ) | Select-Object -Unique
        if ($targets.Count -gt 0) {
          docker compose up -d --force-recreate --no-deps @targets
        } else {
          docker compose up -d --force-recreate
        }
        if ($LASTEXITCODE -ne 0) {
          # Fallback: sobe o stack sem forcar tudo
          docker compose up -d
        }
        if ($LASTEXITCODE -ne 0) {
          throw 'docker compose retornou erro ao recriar servicos.'
        }
        $detail = if ($targets.Count -gt 0) {
          'Recriados: ' + ($targets -join ', ')
        } else {
          'Stack Supabase recriado'
        }
        Set-Step $steps 'supabase-url' 'ok' $detail
      } finally {
        Pop-Location
      }
    } catch {
      Set-Step $steps 'supabase-url' 'warn' ("Nao foi possivel recriar agora: {0}. URLs ja estao no .env." -f $_.Exception.Message)
    }
  }

  $warnCount = @($steps | Where-Object { $_.status -eq 'warn' }).Count
  $msg = if ($warnCount -gt 0) {
    "Endereco $alias aplicado com $warnCount aviso(s)."
  } else {
    "Endereco $alias aplicado e rede alinhada."
  }
  Save-JobState 'done' $msg $steps $ip
  exit 0
} catch {
  $failed = @($steps | Where-Object { $_.status -eq 'running' } | Select-Object -First 1)
  if ($failed) {
    Set-Step $steps ([string]$failed.id) 'error' $_.Exception.Message
  }
  Save-JobState 'error' $_.Exception.Message $steps $ip
  exit 1
}
