# Funções compartilhadas pelos scripts do servidor-portátil.

function Get-ServidorRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Normalize-AliasInput([string]$Raw) {
  $a = [string]$Raw
  $a = $a.Trim()
  $a = $a -replace '^\s*https?://', ''
  $a = $a.Split('/')[0]
  $a = $a.Split(':')[0]
  $a = $a.Trim().ToLowerInvariant().TrimEnd('.')
  if (-not $a) { $a = 'sistema.acompomps.rede' }
  return $a
}

function Import-ServidorConfig {
  $root = Get-ServidorRoot
  $cfgPath = Join-Path $root 'config.env'
  if (-not (Test-Path $cfgPath)) {
    throw "Arquivo não encontrado: $cfgPath`nCopie config.env.example para config.env e preencha."
  }

  $map = @{}
  Get-Content $cfgPath -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $key = $line.Substring(0, $i).Trim()
    $val = $line.Substring($i + 1).Trim()
    $map[$key] = $val
  }

  foreach ($req in @('SERVER_HOST', 'SUPABASE_DOCKER_DIR', 'FRONTEND_DIR')) {
    if (-not $map[$req]) { throw "config.env: faltando $req" }
  }

  if (-not $map['SUPABASE_PORT']) { $map['SUPABASE_PORT'] = '8000' }
  if (-not $map['APP_PORT']) { $map['APP_PORT'] = '5173' }
  if (-not $map['SERVER_ALIAS']) { $map['SERVER_ALIAS'] = 'sistema.acompomps.rede' }

  return [pscustomobject]$map
}

function Get-PreferredLanIPv4 {
  try {
    $candidates = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.*' -and
        $_.InterfaceAlias -notlike 'vEthernet*' -and
        $_.InterfaceAlias -notlike '*Docker*' -and
        $_.InterfaceAlias -notlike '*WSL*' -and
        $_.InterfaceAlias -notlike '*Loopback*'
      })
    $lan = $candidates |
      Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } |
      Sort-Object -Property InterfaceMetric |
      Select-Object -First 1
    if ($lan) { return [string]$lan.IPAddress }
    if ($candidates.Count -gt 0) { return [string]$candidates[0].IPAddress }
  } catch { }
  return $null
}

function Get-AnonKeyFromSupabase([string]$DockerDir) {
  $envFile = Join-Path $DockerDir '.env'
  if (-not (Test-Path $envFile)) { throw "Não achei .env em $DockerDir" }
  $line = Get-Content $envFile -Encoding UTF8 | Where-Object { $_ -match '^\s*ANON_KEY=' } | Select-Object -First 1
  if (-not $line) { throw "ANON_KEY não encontrada em $envFile" }
  return ($line -replace '^\s*ANON_KEY=', '').Trim()
}

function Test-DockerRunning {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  docker info 1>$null 2>$null
  $ok = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prev
  return $ok
}

function Assert-DockerRunning {
  if (-not (Test-DockerRunning)) {
    throw "Docker Desktop não está rodando. Abra o Docker Desktop, espere ficar pronto e tente de novo."
  }
}

function Set-EnvKey([string]$Path, [string]$Key, [string]$Value) {
  if (-not (Test-Path $Path)) { throw "Arquivo não encontrado: $Path" }
  $lines = Get-Content $Path -Encoding UTF8
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$([regex]::Escape($Key))=") {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) { $out += "$Key=$Value" }
  Set-Content -Path $Path -Value $out -Encoding UTF8
}

function Test-AcompOmpsHostsAlias([string]$Alias, [string]$Ip = '') {
  try {
    $hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
    if (-not (Test-Path -LiteralPath $hostsPath)) { return $false }
    $alias = ([string]$Alias).Trim().ToLowerInvariant()
    if (-not $alias) { return $false }
    $lines = @(Get-Content -LiteralPath $hostsPath -ErrorAction SilentlyContinue)
    foreach ($line in $lines) {
      if (-not $line -or $line.Trim().StartsWith('#')) { continue }
      if ($line -notmatch [regex]::Escape($alias)) { continue }
      if ($Ip -and ($line -notmatch [regex]::Escape($Ip))) { continue }
      return $true
    }
    return $false
  } catch { return $false }
}

function Set-AcompOmpsHostsAlias(
  [string]$Ip,
  [string]$Alias,
  [switch]$AllowElevate
) {
  $ip = ([string]$Ip).Trim()
  $alias = ([string]$Alias).Trim().ToLowerInvariant().TrimEnd('.')
  if (-not $ip -or -not $alias) {
    return [pscustomobject]@{ ok = $false; elevated = $false; error = 'IP/alias vazios para hosts.' }
  }
  if (Test-AcompOmpsHostsAlias -Alias $alias -Ip $ip) {
    return [pscustomobject]@{ ok = $true; elevated = $false; error = '' }
  }

  $hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
  $marker = '# acompopms-alias'

  function Write-AcompHostsFile {
    $lines = @()
    if (Test-Path -LiteralPath $hostsPath) {
      $lines = @(
        Get-Content -LiteralPath $hostsPath -ErrorAction SilentlyContinue |
          Where-Object { $_ -and ($_ -notmatch [regex]::Escape($marker)) }
      )
    }
    $lines += "$ip`t$alias`t$marker"
    Set-Content -Path $hostsPath -Value $lines -Encoding ASCII
  }

  try {
    Write-AcompHostsFile
    if (Test-AcompOmpsHostsAlias -Alias $alias -Ip $ip) {
      return [pscustomobject]@{ ok = $true; elevated = $false; error = '' }
    }
  } catch {
    $err = $_.Exception.Message
    if (-not $AllowElevate) {
      return [pscustomobject]@{ ok = $false; elevated = $false; error = $err }
    }
  }

  if (-not $AllowElevate) {
    return [pscustomobject]@{
      ok       = $false
      elevated = $false
      error    = 'Nao foi possivel gravar o arquivo hosts (precisa Admin).'
    }
  }

  $tmp = Join-Path $env:TEMP ("acomp-omps-hosts-{0}.ps1" -f [guid]::NewGuid().ToString('N'))
  $hostsEsc = $hostsPath.Replace("'", "''")
  $ipEsc = $ip.Replace("'", "''")
  $aliasEsc = $alias.Replace("'", "''")
  $markerEsc = $marker.Replace("'", "''")
  $elev = @"
`$ErrorActionPreference = 'Stop'
`$hostsPath = '$hostsEsc'
`$marker = '$markerEsc'
`$ip = '$ipEsc'
`$alias = '$aliasEsc'
`$lines = @()
if (Test-Path -LiteralPath `$hostsPath) {
  `$lines = @(Get-Content -LiteralPath `$hostsPath | Where-Object { `$_ -and (`$_ -notmatch [regex]::Escape(`$marker)) })
}
`$lines += (`$ip + [char]9 + `$alias + [char]9 + `$marker)
Set-Content -Path `$hostsPath -Value `$lines -Encoding ASCII
"@
  Set-Content -LiteralPath $tmp -Value $elev -Encoding UTF8

  try {
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $tmp
    ) -Verb RunAs -Wait -PassThru -WindowStyle Hidden
    if ($p.ExitCode -ne 0 -or -not (Test-AcompOmpsHostsAlias -Alias $alias -Ip $ip)) {
      return [pscustomobject]@{
        ok       = $false
        elevated = $true
        error    = 'Falha ao gravar hosts mesmo com elevacao (UAC negado ou sem Admin).'
      }
    }
    return [pscustomobject]@{ ok = $true; elevated = $true; error = '' }
  } catch {
    return [pscustomobject]@{
      ok       = $false
      elevated = $true
      error    = $_.Exception.Message
    }
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}
