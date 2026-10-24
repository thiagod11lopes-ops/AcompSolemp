# Configuracao do e-mail unico do gestor (Dashboard do servidor).
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

function Get-GestorConfigPath {
  $dir = Join-Path (Get-ServidorRoot) 'state'
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return (Join-Path $dir 'gestor-config.json')
}

function Get-GestorOwnerFromDatabase {
  try {
    $lines = Invoke-SupabaseSql @"
SELECT lower(owner_email)
FROM public.tenants
WHERE nullif(trim(owner_email), '') IS NOT NULL
ORDER BY created_at NULLS LAST, lower(owner_email)
LIMIT 2;
"@
    $owners = @($lines | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim().ToLowerInvariant() })
    if ($owners.Count -eq 1) { return $owners[0] }
  } catch { }
  return ''
}

function Get-GestorConfig {
  $path = Get-GestorConfigPath
  $email = ''
  $source = 'none'
  if (Test-Path $path) {
    try {
      $raw = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($raw.gestorEmail) {
        $email = ([string]$raw.gestorEmail).Trim().ToLowerInvariant()
        if ($email) { $source = 'config' }
      }
    } catch { }
  }
  if (-not $email) {
    $detected = Get-GestorOwnerFromDatabase
    if ($detected) {
      $email = $detected
      $source = 'database'
    }
  }
  return @{
    gestorEmail = $email
    source      = $source
  }
}

function Test-MarinhaEmail([string]$Email) {
  $e = $Email.Trim().ToLowerInvariant()
  return ($e -match '^[^\s@]+@marinha\.mil\.br$')
}

function Set-GestorConfig([string]$Email) {
  $e = $Email.Trim().ToLowerInvariant()
  if (-not $e) { throw 'Informe o e-mail do gestor.' }
  if (-not (Test-MarinhaEmail $e)) {
    throw 'O e-mail do gestor deve ser @marinha.mil.br.'
  }
  $path = Get-GestorConfigPath
  $obj = @{ gestorEmail = $e; updatedAt = (Get-Date).ToString('o') }
  ($obj | ConvertTo-Json -Compress) | Set-Content -Path $path -Encoding UTF8
  Update-ServerConfigGestorEmail $e
  return $obj
}

function Update-ServerConfigGestorEmail([string]$Email) {
  try {
    $cfg = Import-ServidorConfig
    $frontendDir = [string]$cfg.FRONTEND_DIR
  } catch { return }

  $jsPath = Join-Path $frontendDir 'public\server-config.js'
  if (-not (Test-Path $jsPath)) { return }

  $anon = ''
  $url = ''
  $alias = ''
  $ip = ''
  try {
    $txt = Get-Content $jsPath -Raw -Encoding UTF8
    if ($txt -match "supabaseAnonKey:\s*'([^']*)'") { $anon = $Matches[1] }
    if ($txt -match "supabaseUrl:\s*'([^']*)'") { $url = $Matches[1] }
    if ($txt -match "serverAlias:\s*'([^']*)'") { $alias = $Matches[1] }
    if ($txt -match "serverIp:\s*'([^']*)'") { $ip = $Matches[1] }
  } catch { }

  if (-not $url) {
    try {
      $c = Import-ServidorConfig
      $alias = Normalize-AliasInput ([string]$c.SERVER_ALIAS)
      $url = "https://$alias"
      $ip = [string]$c.SERVER_HOST
      $anon = Get-AnonKeyFromSupabase ([string]$c.SUPABASE_DOCKER_DIR)
    } catch { return }
  }

  $emailEsc = $Email.Replace("'", "\'")
  $js = @(
    '/* Gerado por Dashboard / Aplicar-Host - nao editar a mao */'
    'window.__ACOMP_SERVER__ = {'
    "  dataSource: 'supabase',"
    "  supabaseUrl: '$url',"
    "  supabaseAnonKey: '$anon',"
    "  serverAlias: '$alias',"
    "  serverIp: '$ip',"
    "  gestorEmail: '$emailEsc',"
    '};'
  ) -join [Environment]::NewLine

  Set-Content -Path $jsPath -Value $js -Encoding UTF8
  $distJs = Join-Path $frontendDir 'dist\server-config.js'
  if (Test-Path (Join-Path $frontendDir 'dist')) {
    Set-Content -Path $distJs -Value $js -Encoding UTF8
  }
}

function Invoke-SupabaseSql([string]$Sql) {
  $name = 'supabase-db'
  docker inspect $name 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Container supabase-db nao esta em execucao. Inicie o servidor OMPS.' }
  $out = $Sql | docker exec -i $name psql -U postgres -d postgres -v ON_ERROR_STOP=1 -t -A -F '|' 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ("Falha ao consultar o banco: {0}" -f ($out | Out-String))
  }
  return @($out)
}

function Get-GestorTeamEmailLists {
  $cfg = Get-GestorConfig
  $gestor = [string]$cfg.gestorEmail
  if (-not $gestor) {
    return @{
      gestorEmail = ''
      loggedIn    = @()
      pending     = @()
      error       = 'Salve o e-mail do gestor no card acima (o mesmo com que voce entra no Portal do Gestor).'
    }
  }

  $gestorSql = $gestor.Replace("'", "''")
  $tenantLines = Invoke-SupabaseSql @"
SELECT t.id::text
FROM public.tenants t
WHERE lower(t.owner_email) = lower('$gestorSql')
LIMIT 1;
"@
  $tenantId = ($tenantLines | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1)

  # Fallback: se o e-mail salvo nao bate com owner_email, usa o unico tenant existente
  if (-not $tenantId) {
    $fallback = Invoke-SupabaseSql @"
SELECT t.id::text || '|' || lower(t.owner_email)
FROM public.tenants t
WHERE nullif(trim(t.owner_email), '') IS NOT NULL
ORDER BY t.created_at NULLS LAST
LIMIT 2;
"@
    $fb = @($fallback | Where-Object { $_ -and $_.Trim() })
    if ($fb.Count -eq 1 -and $fb[0] -match '^([^|]+)\|(.+)$') {
      $tenantId = $Matches[1]
      $gestor = $Matches[2]
      $gestorSql = $gestor.Replace("'", "''")
    }
  }

  if (-not $tenantId) {
    return @{
      gestorEmail = $gestor
      loggedIn    = @()
      pending     = @()
      error       = "Nao achei organizacao para o gestor '$gestor'. Confira se o e-mail salvo e o mesmo do Portal do Gestor."
    }
  }

  $tenantSql = $tenantId.Replace("'", "''")
  $rows = Invoke-SupabaseSql @"
SELECT
  lower(trim(ea.email)),
  coalesce(nullif(trim(ea.perfil), ''), 'USUARIO'),
  coalesce(ea.nome, ''),
  CASE
    WHEN u.id IS NOT NULL AND u.last_sign_in_at IS NOT NULL THEN '1'
    ELSE '0'
  END,
  coalesce(to_char(u.last_sign_in_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI'), '')
FROM public.email_access ea
LEFT JOIN auth.users u ON lower(u.email) = lower(trim(ea.email))
WHERE ea.tenant_id = '$tenantSql'::uuid
  AND nullif(trim(ea.email), '') IS NOT NULL
  AND lower(trim(ea.email)) <> lower('$gestorSql')
ORDER BY lower(trim(ea.email));
"@

  $loggedIn = @()
  $pending = @()
  foreach ($line in @($rows)) {
    if (-not $line -or -not "$line".Trim()) { continue }
    $p = "$line" -split '\|', 5
    if ($p.Count -lt 4) { continue }
    $item = [pscustomobject]@{
      email        = $p[0]
      perfil       = $p[1]
      nome         = $p[2]
      lastSignInAt = if ($p.Count -gt 4) { $p[4] } else { '' }
    }
    if ($p[3] -eq '1') { $loggedIn += $item } else { $pending += $item }
  }

  return @{
    gestorEmail = $gestor
    loggedIn    = @($loggedIn)
    pending     = @($pending)
    error       = ''
  }
}
