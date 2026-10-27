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

function Get-GestorSinceMigrationPath {
  $root = Get-ServidorRoot
  foreach ($c in @(
      (Join-Path (Split-Path $root -Parent) 'supabase\migration_gestor_since_transfer.sql'),
      (Join-Path $root '..\..\supabase\migration_gestor_since_transfer.sql'),
      (Join-Path $PSScriptRoot '..\..\supabase\migration_gestor_since_transfer.sql')
    )) {
    try {
      if ($c -and (Test-Path -LiteralPath $c)) { return (Resolve-Path -LiteralPath $c).Path }
    } catch { }
  }
  return $null
}

function Get-SupabaseMigrationPath([string]$FileName) {
  $root = Get-ServidorRoot
  foreach ($c in @(
      (Join-Path (Split-Path $root -Parent) "supabase\$FileName"),
      (Join-Path $root "..\..\supabase\$FileName"),
      (Join-Path $PSScriptRoot "..\..\supabase\$FileName")
    )) {
    try {
      if ($c -and (Test-Path -LiteralPath $c)) { return (Resolve-Path -LiteralPath $c).Path }
    } catch { }
  }
  return $null
}

# Garante tabela planilhas_livres + RPC de leitura (IMH/Div. Material apos F5).
function Ensure-PlanilhasLivresSchema {
  foreach ($name in @(
      'migration_planilhas_livres.sql',
      'migration_planilhas_livres_rpc.sql'
    )) {
    $mig = Get-SupabaseMigrationPath $name
    if (-not $mig) { continue }
    try {
      $sql = [System.IO.File]::ReadAllText($mig, [System.Text.UTF8Encoding]::new($false))
      [void](Invoke-SupabaseSql $sql)
      Write-Host "Schema planilhas: aplicado $name"
    } catch {
      Write-Host ("Aviso: falha ao aplicar {0}: {1}" -f $name, $_.Exception.Message)
    }
  }
}

function Ensure-GestorSinceSchema {
  # Aplica migration completa (coluna + RPCs) quando o arquivo existir; senao so a coluna.
  $mig = Get-GestorSinceMigrationPath
  if ($mig) {
    try {
      $sql = [System.IO.File]::ReadAllText($mig, [System.Text.UTF8Encoding]::new($false))
      [void](Invoke-SupabaseSql $sql)
      return
    } catch { }
  }
  $sql = @'
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gestor_since date;
UPDATE public.tenants
SET gestor_since = (created_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE gestor_since IS NULL;
'@
  try { [void](Invoke-SupabaseSql $sql) } catch { }
}

function Transfer-GestorTenantOwnership([string]$PreviousEmail, [string]$NewEmail) {
  Ensure-GestorSinceSchema
  $prev = ([string]$PreviousEmail).Trim().ToLowerInvariant().Replace("'", "''")
  $new = ([string]$NewEmail).Trim().ToLowerInvariant().Replace("'", "''")

  # Tenta RPC; se nao existir, aplica SQL equivalente inline.
  try {
    $lines = Invoke-SupabaseSql @"
SELECT tenant_id::text, org_code, owner_email, coalesce(gestor_since::text, '')
FROM public.transfer_gestor_tenant_ownership('$prev', '$new');
"@
    $row = @($lines | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1)
    if ($row) {
      $p = "$row" -split '\|', 4
      return @{
        tenantId    = $p[0]
        orgCode     = $p[1]
        ownerEmail  = $p[2]
        gestorSince = $p[3]
        transferred = $true
      }
    }
  } catch {
    # Fallback sem RPC (banco antigo)
  }

  $fallback = Invoke-SupabaseSql @"
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gestor_since date;
UPDATE public.tenants
SET gestor_since = (created_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE gestor_since IS NULL;

DO `$`$
DECLARE
  v_prev text := lower(trim('$prev'));
  v_new text := lower(trim('$new'));
  v_tenant uuid;
  v_new_user uuid;
  v_since date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_owner_app text;
BEGIN
  IF v_prev <> '' THEN
    SELECT id INTO v_tenant FROM public.tenants WHERE lower(owner_email) = v_prev LIMIT 1;
  END IF;
  IF v_tenant IS NULL THEN
    SELECT id INTO v_tenant FROM public.tenants
    WHERE nullif(trim(owner_email), '') IS NOT NULL
    ORDER BY created_at NULLS LAST
    LIMIT 1;
  END IF;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Nenhuma organizacao encontrada para transferir.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.tenants WHERE lower(owner_email) = v_new AND id <> v_tenant
  ) THEN
    RAISE EXCEPTION 'O novo e-mail ja e dono de outra organizacao.';
  END IF;
  SELECT id INTO v_new_user FROM auth.users WHERE lower(email) = v_new LIMIT 1;
  v_owner_app := 'user-owner-' || v_tenant::text;
  UPDATE public.tenants
  SET owner_email = v_new,
      owner_user_id = COALESCE(v_new_user, owner_user_id),
      gestor_since = v_since
  WHERE id = v_tenant;
  IF v_new_user IS NOT NULL THEN
    INSERT INTO public.profiles (id, tenant_id, app_user_id, email, perfil)
    VALUES (v_new_user, v_tenant, v_owner_app, v_new, 'GESTOR')
    ON CONFLICT (id) DO UPDATE
      SET tenant_id = EXCLUDED.tenant_id,
          app_user_id = EXCLUDED.app_user_id,
          email = EXCLUDED.email,
          perfil = 'GESTOR';
  END IF;
END
`$`$;

SELECT t.id::text, t.org_code, lower(t.owner_email), coalesce(t.gestor_since::text, '')
FROM public.tenants t
WHERE lower(t.owner_email) = lower('$new')
LIMIT 1;
"@
  $row = @($fallback | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1)
  if (-not $row) { throw 'Transferencia do gestor nao retornou organizacao.' }
  $p = "$row" -split '\|', 4
  return @{
    tenantId    = $p[0]
    orgCode     = $p[1]
    ownerEmail  = $p[2]
    gestorSince = $p[3]
    transferred = $true
  }
}

function Set-GestorConfig([string]$Email) {
  $e = $Email.Trim().ToLowerInvariant()
  if (-not $e) { throw 'Informe o e-mail do gestor.' }
  if (-not (Test-MarinhaEmail $e)) {
    throw 'O e-mail do gestor deve ser @marinha.mil.br.'
  }

  $previous = ''
  try { $previous = [string](Get-GestorConfig).gestorEmail } catch { }

  $path = Get-GestorConfigPath
  $transfer = $null
  if ($previous -and $previous -ne $e) {
    $transfer = Transfer-GestorTenantOwnership -PreviousEmail $previous -NewEmail $e
  } else {
    # Primeiro cadastro ou mesmo e-mail: garante schema e data inicial se houver tenant.
    try {
      Ensure-GestorSinceSchema
      $esc = $e.Replace("'", "''")
      [void](Invoke-SupabaseSql @"
UPDATE public.tenants
SET gestor_since = COALESCE(gestor_since, (created_at AT TIME ZONE 'America/Sao_Paulo')::date)
WHERE lower(owner_email) = lower('$esc')
   OR (
     lower(owner_email) <> lower('$esc')
     AND (SELECT count(*) FROM public.tenants WHERE nullif(trim(owner_email), '') IS NOT NULL) = 1
   );
"@)
    } catch { }
  }

  $obj = @{
    gestorEmail = $e
    updatedAt   = (Get-Date).ToString('o')
    gestorSince = if ($transfer) { $transfer.gestorSince } else { $null }
    transferred = [bool]$transfer
  }
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

  # UTF-8 via arquivo no container: evita mojibake (ex.: "D├¡ogenes") no console Windows.
  $id = [guid]::NewGuid().ToString('N')
  $tmpSql = Join-Path $env:TEMP "acomp-sql-$id.sql"
  $tmpOut = Join-Path $env:TEMP "acomp-sql-$id.out"
  $tmpErr = Join-Path $env:TEMP "acomp-sql-$id.err"
  $remoteSql = "/tmp/acomp-sql-$id.sql"
  $utf8 = New-Object System.Text.UTF8Encoding $false
  try {
    [System.IO.File]::WriteAllText($tmpSql, $Sql.Trim() + "`n", $utf8)
    docker cp $tmpSql "${name}:$remoteSql" 1>$null
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar SQL para o container supabase-db.' }

    $p = Start-Process -FilePath 'docker' -ArgumentList @(
      'exec', '-e', 'PGCLIENTENCODING=UTF8', $name,
      'psql', '-U', 'postgres', '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-F', '|',
      '-f', $remoteSql
    ) -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr `
      -Wait -PassThru -NoNewWindow

    docker exec $name rm -f $remoteSql 1>$null 2>$null

    if ($p.ExitCode -ne 0) {
      $errTxt = ''
      if (Test-Path $tmpErr) { $errTxt = [System.IO.File]::ReadAllText($tmpErr, $utf8) }
      throw ("Falha ao consultar o banco: {0}" -f $errTxt.Trim())
    }

    if (-not (Test-Path $tmpOut)) { return @() }
    $text = [System.IO.File]::ReadAllText($tmpOut, $utf8)
    return @($text -split '\r?\n' | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne '' })
  } finally {
    Remove-Item $tmpSql, $tmpOut, $tmpErr -Force -ErrorAction SilentlyContinue
  }
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

function Format-DurationLabel([long]$Seconds) {
  if ($Seconds -le 0) { return '0 min' }
  $d = [int][math]::Floor($Seconds / 86400)
  $h = [int][math]::Floor(($Seconds % 86400) / 3600)
  $m = [int][math]::Floor(($Seconds % 3600) / 60)
  if ($d -gt 0) { return ('{0}d {1}h' -f $d, $h) }
  if ($h -gt 0) { return ('{0}h {1}min' -f $h, $m) }
  return ('{0} min' -f [math]::Max(1, $m))
}

function Get-GestorUsageByUser {
  $cfg = Get-GestorConfig
  $gestor = [string]$cfg.gestorEmail
  if (-not $gestor) {
    return @{
      gestorEmail = ''
      users       = @()
      error       = 'Salve o e-mail do gestor para ver o tempo de uso.'
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
      users       = @()
      error       = 'Organizacao do gestor nao encontrada.'
    }
  }

  $tenantSql = $tenantId.Replace("'", "''")
  # Tempo estimado = soma da duracao das sessoes (updated_at/not_after - created_at).
  $rows = Invoke-SupabaseSql @"
WITH team AS (
  SELECT lower('$gestorSql') AS email, 'Gestor'::text AS nome, 'GESTOR'::text AS perfil, 0 AS rk
  UNION ALL
  SELECT
    lower(trim(ea.email)),
    coalesce(nullif(trim(ea.nome), ''), split_part(lower(trim(ea.email)), '@', 1)),
    coalesce(nullif(trim(ea.perfil), ''), 'USUARIO'),
    1
  FROM public.email_access ea
  WHERE ea.tenant_id = '$tenantSql'::uuid
    AND nullif(trim(ea.email), '') IS NOT NULL
    AND lower(trim(ea.email)) <> lower('$gestorSql')
),
sess AS (
  SELECT
    lower(u.email) AS email,
    COALESCE(SUM(
      GREATEST(
        0,
        EXTRACT(EPOCH FROM (
          CASE
            WHEN s.not_after IS NOT NULL AND s.not_after < now() THEN s.not_after
            WHEN s.refreshed_at IS NOT NULL AND s.refreshed_at::timestamptz > s.updated_at
              THEN s.refreshed_at::timestamptz
            WHEN s.updated_at > s.created_at + interval '30 seconds' THEN s.updated_at
            ELSE now()
          END
          - s.created_at
        ))
      )
    ), 0)::bigint AS seconds_used,
    COUNT(s.id)::int AS session_count
  FROM auth.users u
  LEFT JOIN auth.sessions s ON s.user_id = u.id
  GROUP BY lower(u.email)
)
SELECT
  t.email,
  t.nome,
  t.perfil,
  COALESCE(s.seconds_used, 0)::text,
  COALESCE(s.session_count, 0)::text
FROM team t
LEFT JOIN sess s ON s.email = t.email
ORDER BY COALESCE(s.seconds_used, 0) DESC, t.rk, t.email;
"@

  $users = @()
  foreach ($line in @($rows)) {
    if (-not $line -or -not "$line".Trim()) { continue }
    $p = "$line" -split '\|', 5
    if ($p.Count -lt 4) { continue }
    $sec = 0L
    [void][long]::TryParse($p[3], [ref]$sec)
    $sessions = 0
    if ($p.Count -gt 4) { [void][int]::TryParse($p[4], [ref]$sessions) }
    $users += [pscustomobject]@{
      email         = $p[0]
      nome          = $p[1]
      perfil        = $p[2]
      seconds       = $sec
      hours         = [math]::Round($sec / 3600.0, 2)
      label         = Format-DurationLabel $sec
      sessionCount  = $sessions
    }
  }

  return @{
    gestorEmail = $gestor
    users       = @($users)
    error       = ''
  }
}
