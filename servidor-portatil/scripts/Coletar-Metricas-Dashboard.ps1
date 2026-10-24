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

  $uptimeSec = 0
  try {
    $boot = $os.LastBootUpTime
    $uptimeSec = [int]((Get-Date) - [datetime]$boot).TotalSeconds
  } catch { }

  $usage = Get-UsageByHour

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
    usageByHour = $usage
  }
}
