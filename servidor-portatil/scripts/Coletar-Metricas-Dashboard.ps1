# Coleta metricas do servidor AcompOPMS para o Dashboard.
# Retorna um hashtable serializavel em JSON.

$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\_common.ps1"

function Get-HttpCode([string]$Url, [int]$TimeoutSec = 4) {
  try {
    $code = & curl.exe -sk -o NUL -w '%{http_code}' --max-time $TimeoutSec $Url 2>$null
    if ("$code" -match '^\d{3}$') { return [int]$code }
  } catch { }
  return 0
}

function Get-BytesFriendly([long]$Bytes) {
  if ($Bytes -ge 1TB) { return ('{0:N1} TB' -f ($Bytes / 1TB)) }
  if ($Bytes -ge 1GB) { return ('{0:N1} GB' -f ($Bytes / 1GB)) }
  if ($Bytes -ge 1MB) { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
  return ('{0:N0} KB' -f ($Bytes / 1KB))
}

function Test-VcRedistInstalled {
  foreach ($k in @(
      'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64',
      'HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64'
    )) {
    if (Test-Path $k) {
      try {
        if ((Get-ItemProperty $k -ErrorAction Stop).Installed -eq 1) { return $true }
      } catch { }
    }
  }
  return $false
}

function Test-WslInstalled {
  try {
    & wsl.exe --status 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) { return $true }
    $o = & wsl.exe -l -v 2>&1 | Out-String
    if ($o -match 'Ubuntu|docker-desktop|Windows Subsystem') { return $true }
  } catch { }
  return $false
}

function Test-NodeInstalled {
  try {
    $v = & node -v 2>$null
    return ($LASTEXITCODE -eq 0 -and "$v" -match '^v\d+')
  } catch { return $false }
}

function Test-FirewallRulesReady {
  try {
    $out = & netsh advfirewall firewall show rule name='AcompOPMS Gateway 443' 2>$null | Out-String
    if ($out -match 'AcompOPMS Gateway 443') { return $true }
    $out2 = & netsh advfirewall firewall show rule name='AcompOPMS DNS Alias 53' 2>$null | Out-String
    return ($out2 -match 'AcompOPMS DNS Alias 53')
  } catch { return $false }
}

function Test-HostsAliasReady([string]$Alias) {
  try {
    $hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
    if (-not (Test-Path -LiteralPath $hostsPath)) { return $false }
    $lines = @(Get-Content -LiteralPath $hostsPath -ErrorAction SilentlyContinue)
    return [bool]($lines | Where-Object {
        $_ -and ($_ -match 'acompopms-alias' -or ($Alias -and $_ -match [regex]::Escape($Alias)))
      })
  } catch { return $false }
}

function Get-FirewallRedeCheck([string]$Alias, [bool]$HttpsOk) {
  $rules = Test-FirewallRulesReady
  $hostsOk = Test-HostsAliasReady $Alias
  if ($HttpsOk) {
    return @{ ok = $true; label = 'Pronto HTTPS'; detail = "https://${Alias}/ acessivel" }
  }
  if ($rules -and $hostsOk) {
    return @{ ok = $true; label = 'Firewall OK'; detail = 'Regras e hosts prontos — suba o servidor' }
  }
  $parts = @()
  if (-not $rules) { $parts += 'regras' }
  if (-not $hostsOk) { $parts += 'hosts' }
  return @{
    ok     = $false
    label  = if ($rules -or $hostsOk) { 'Incompleto' } else { 'Pendente' }
    detail = ('Falta: {0}. Use Liberar Firewall (Admin).' -f ($parts -join ', '))
  }
}

function Get-FolderSizeBytes([string]$Path) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return 0L }
  try {
    $sum = (Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum).Sum
    if ($null -eq $sum) { return 0L }
    return [long]$sum
  } catch { return 0L }
}

function Get-UsageByHour {
  $hours = @(0) * 24
  try {
    $raw = docker logs acomp-gateway --since 7d 2>&1 | Out-String
    if ($raw) {
      foreach ($line in ($raw -split "`n")) {
        # nginx: 24/Oct/2026:02:30:39  ou ISO
        if ($line -match '\[(\d{2})/(\w{3})/(\d{4}):(\d{2}):') {
          $h = [int]$Matches[4]
          if ($h -ge 0 -and $h -le 23) { $hours[$h]++ }
        } elseif ($line -match 'T(\d{2}):\d{2}:\d{2}') {
          $h = [int]$Matches[1]
          if ($h -ge 0 -and $h -le 23) { $hours[$h]++ }
        }
      }
    }
  } catch { }

  # Fallback: iniciar-auto.log
  if (($hours | Measure-Object -Sum).Sum -eq 0) {
    $log = Join-Path (Get-ServidorRoot) 'logs\iniciar-auto.log'
    if (Test-Path $log) {
      Get-Content $log -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_ -match '^(\d{4}-\d{2}-\d{2})\s+(\d{2}):') {
          $h = [int]$Matches[2]
          if ($h -ge 0 -and $h -le 23) { $hours[$h]++ }
        }
      }
    }
  }

  $labels = 0..23 | ForEach-Object { '{0:D2}h' -f $_ }
  return @{
    labels = @($labels)
    values = @($hours)
    source = if (($hours | Measure-Object -Sum).Sum -gt 0) { 'gateway+logs' } else { 'sem-dados' }
  }
}

function Get-DashboardMetrics {
  $root = Get-ServidorRoot
  $cfg = $null
  try { $cfg = Import-ServidorConfig } catch { }

  $alias = if ($cfg) { Normalize-AliasInput ([string]$cfg.SERVER_ALIAS) } else { 'sistema.acompomps.rede' }
  $ip = if ($cfg -and $cfg.SERVER_HOST) { [string]$cfg.SERVER_HOST } else { Get-PreferredLanIPv4 }
  if (-not $ip) { $ip = '127.0.0.1' }

  $os = Get-CimInstance Win32_OperatingSystem
  $totalMem = [long]$os.TotalVisibleMemorySize * 1KB
  $freeMem = [long]$os.FreePhysicalMemory * 1KB
  $usedMem = $totalMem - $freeMem
  $memPct = if ($totalMem -gt 0) { [math]::Round(100.0 * $usedMem / $totalMem, 1) } else { 0 }

  $cpuLoad = 0
  try {
    $cpuLoad = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average, 1)
  } catch { }

  $diskRows = @()
  Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $size = [long]$_.Size
    $free = [long]$_.FreeSpace
    if ($size -le 0) { return }
    $used = $size - $free
    $diskRows += @{
      name       = [string]$_.DeviceID
      label      = if ($_.VolumeName) { $_.VolumeName } else { $_.DeviceID }
      totalBytes = $size
      usedBytes  = $used
      freeBytes  = $free
      usedPct    = [math]::Round(100.0 * $used / $size, 1)
      totalLabel = Get-BytesFriendly $size
      usedLabel  = Get-BytesFriendly $used
      freeLabel  = Get-BytesFriendly $free
    }
  }

  $packPaths = @(
    @{ key = 'frontend'; path = if ($cfg) { [string]$cfg.FRONTEND_DIR } else { $null } },
    @{ key = 'supabase'; path = if ($cfg) { [string]$cfg.SUPABASE_DOCKER_DIR } else { $null } },
    @{ key = 'servidor'; path = $root }
  )
  $packSizes = @()
  foreach ($p in $packPaths) {
    if (-not $p.path) { continue }
    $bytes = Get-FolderSizeBytes $p.path
    $packSizes += @{
      name  = $p.key
      path  = $p.path
      bytes = $bytes
      label = Get-BytesFriendly $bytes
    }
  }

  $dockerOk = $false
  try { $dockerOk = [bool](Test-DockerRunning) } catch { }

  $containers = @()
  if ($dockerOk) {
    try {
      $lines = docker ps --format "{{.Names}}|{{.Status}}|{{.Ports}}" 2>$null
      foreach ($line in @($lines)) {
        if (-not $line) { continue }
        $parts = $line -split '\|', 3
        $containers += @{
          name   = $parts[0]
          status = $parts[1]
          ports  = if ($parts.Count -gt 2) { $parts[2] } else { '' }
          ok     = ($parts[1] -match 'Up')
        }
      }
    } catch { }
  }

  $services = @(
    @{
      id     = 'gateway'
      name   = 'Gateway HTTPS'
      url    = "https://${alias}/login"
      code   = (Get-HttpCode "https://${alias}/login")
    },
    @{
      id     = 'vite'
      name   = 'Frontend (Vite)'
      url    = 'http://127.0.0.1:5173/login'
      code   = (Get-HttpCode 'http://127.0.0.1:5173/login')
    },
    @{
      id     = 'supabase'
      name   = 'Supabase API'
      url    = 'http://127.0.0.1:8000/auth/v1/health'
      code   = (Get-HttpCode 'http://127.0.0.1:8000/auth/v1/health')
    },
    @{
      id     = 'authGw'
      name   = 'Auth via gateway'
      url    = "https://${alias}/auth/v1/health"
      code   = (Get-HttpCode "https://${alias}/auth/v1/health")
    }
  )
  foreach ($s in $services) {
    # Health do Auth/Kong pode responder 401 e mesmo assim estar no ar.
    $s.ok = ($s.code -ge 200 -and $s.code -lt 400) -or (
      $s.code -eq 401 -and ($s.id -eq 'supabase' -or $s.id -eq 'authGw')
    )
    $s.label = if ($s.ok) { 'Online' } elseif ($s.code -eq 0) { 'Offline' } else { "HTTP $($s.code)" }
  }

  $fePath = if ($cfg -and $cfg.FRONTEND_DIR) { [string]$cfg.FRONTEND_DIR } else { $null }
  $sbPath = if ($cfg -and $cfg.SUPABASE_DOCKER_DIR) { [string]$cfg.SUPABASE_DOCKER_DIR } else { $null }
  $pastasOk = ($fePath -and (Test-Path -LiteralPath $fePath)) -and ($sbPath -and (Test-Path -LiteralPath $sbPath))
  $pastasDetail = if ($pastasOk) {
    'Frontend e Supabase encontrados'
  } else {
    $miss = @()
    if (-not $fePath -or -not (Test-Path -LiteralPath $fePath)) { $miss += 'frontend' }
    if (-not $sbPath -or -not (Test-Path -LiteralPath $sbPath)) { $miss += 'supabase' }
    'Faltando: ' + ($miss -join ', ')
  }

  $nodeOk = Test-NodeInstalled
  $vcOk = Test-VcRedistInstalled
  $wslOk = Test-WslInstalled
  $gwHttpsOk = [bool](($services | Where-Object { $_.id -eq 'gateway' } | Select-Object -First 1).ok)
  $fw = Get-FirewallRedeCheck -Alias $alias -HttpsOk:$gwHttpsOk

  # Itens que fazem o servidor funcionar (pre-reqs + saude HTTP).
  $stackChecks = @(
    @{
      id = 'docker'; group = 'pre'; name = 'Docker Desktop'
      ok = $dockerOk
      label = if ($dockerOk) { 'Pronto' } else { 'Offline' }
      detail = if ($dockerOk) { 'Docker Desktop em execucao' } else { 'Abra o Docker Desktop e aguarde ficar pronto' }
    },
    @{
      id = 'node'; group = 'pre'; name = 'Node.js'
      ok = $nodeOk
      label = if ($nodeOk) { 'Instalado' } else { 'Nao instalado' }
      detail = if ($nodeOk) { 'node no PATH' } else { 'Instale o Node.js (instaladores do pacote)' }
    },
    @{
      id = 'vcredist'; group = 'pre'; name = 'Visual C++ Redistributable'
      ok = $vcOk
      label = if ($vcOk) { 'Instalado' } else { 'Nao instalado' }
      detail = if ($vcOk) { 'Runtime x64 OK' } else { 'Necessario para alguns componentes nativos' }
    },
    @{
      id = 'wsl'; group = 'pre'; name = 'WSL'
      ok = $wslOk
      label = if ($wslOk) { 'Instalado' } else { 'Nao instalado' }
      detail = if ($wslOk) { 'Windows Subsystem for Linux OK' } else { 'Necessario para o Docker Desktop' }
    },
    @{
      id = 'pastas'; group = 'pre'; name = 'Pastas do sistema'
      ok = $pastasOk
      label = if ($pastasOk) { 'OK' } else { 'Faltando' }
      detail = $pastasDetail
    },
    @{
      id = 'firewall'; group = 'pre'; name = 'Firewall / HTTPS'
      ok = [bool]$fw.ok
      label = [string]$fw.label
      detail = [string]$fw.detail
    }
  )
  foreach ($s in $services) {
    $stackChecks += @{
      id     = $s.id
      group  = 'runtime'
      name   = $s.name
      ok     = [bool]$s.ok
      label  = [string]$s.label
      detail = [string]$s.url
    }
  }
  $stackOk = @($stackChecks | Where-Object { $_.ok }).Count
  $stackTotal = $stackChecks.Count

  $uptimeSec = 0
  try {
    $boot = $os.LastBootUpTime
    $uptimeSec = [int]((Get-Date) - [datetime]$boot).TotalSeconds
  } catch { }

  # Cache do grafico de uso: docker logs e lento e bloqueava o Dashboard inteiro.
  if (-not $script:DashboardUsageCacheAt -or
      -not $script:DashboardUsageCache -or
      ((Get-Date) - [datetime]$script:DashboardUsageCacheAt).TotalSeconds -gt 60) {
    $script:DashboardUsageCache = Get-UsageByHour
    $script:DashboardUsageCacheAt = Get-Date
  }
  $usage = $script:DashboardUsageCache

  return @{
    generatedAt = (Get-Date).ToString('o')
    product     = 'AcompOPMS'
    host        = @{
      computer = $env:COMPUTERNAME
      ip       = $ip
      alias    = $alias
      publicUrl = "https://$alias"
    }
    memory = @{
      totalBytes = $totalMem
      usedBytes  = $usedMem
      freeBytes  = $freeMem
      usedPct    = $memPct
      totalLabel = Get-BytesFriendly $totalMem
      usedLabel  = Get-BytesFriendly $usedMem
      freeLabel  = Get-BytesFriendly $freeMem
    }
    cpu = @{
      loadPct = $cpuLoad
    }
    uptime = @{
      seconds = $uptimeSec
      label   = ('{0}d {1}h {2}m' -f [int]($uptimeSec / 86400), [int](($uptimeSec % 86400) / 3600), [int](($uptimeSec % 3600) / 60))
    }
    disks      = $diskRows
    packSizes  = $packSizes
    docker     = @{
      running    = $dockerOk
      containers = $containers
    }
    services   = $services
    stackChecks = $stackChecks
    stackSummary = @{
      ok    = $stackOk
      total = $stackTotal
      allOk = ($stackTotal -gt 0 -and $stackOk -eq $stackTotal)
    }
    usageByHour = $usage
  }
}
