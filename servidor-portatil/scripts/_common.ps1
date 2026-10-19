# Funções compartilhadas pelos scripts do servidor-portátil.

function Get-ServidorRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
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

  return [pscustomobject]$map
}

function Get-AnonKeyFromSupabase([string]$DockerDir) {
  $envFile = Join-Path $DockerDir '.env'
  if (-not (Test-Path $envFile)) { throw "Não achei .env em $DockerDir" }
  $line = Get-Content $envFile -Encoding UTF8 | Where-Object { $_ -match '^\s*ANON_KEY=' } | Select-Object -First 1
  if (-not $line) { throw "ANON_KEY não encontrada em $envFile" }
  return ($line -replace '^\s*ANON_KEY=', '').Trim()
}

function Assert-DockerRunning {
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop não está rodando. Abra o Docker e tente de novo."
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
