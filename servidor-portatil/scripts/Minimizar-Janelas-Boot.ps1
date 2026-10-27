# Minimiza Docker Desktop e PowerShells auxiliares do boot AcompOPMS.
# Maximiza a janela do Dashboard (Chrome/Edge em modo app).
# Uso: . "$PSScriptRoot\Minimizar-Janelas-Boot.ps1"
#      Invoke-MinimizeAcompOpmsHelpers
#      Invoke-MaximizeAcompOpmsDashboard

if (-not ('AcompOpmsWin32' -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class AcompOpmsWin32 {
  public const int SW_HIDE = 0;
  public const int SW_SHOWNORMAL = 1;
  public const int SW_SHOWMINIMIZED = 2;
  public const int SW_MAXIMIZE = 3;
  public const int SW_SHOWNOACTIVATE = 4;
  public const int SW_MINIMIZE = 6;
  public const int SW_SHOWMINNOACTIVE = 7;
  public const int SW_RESTORE = 9;

  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
}

function Set-AcompOpmsWindowState {
  param(
    [Parameter(Mandatory = $true)][IntPtr]$Handle,
    [ValidateSet('Minimize', 'Maximize', 'Restore')][string]$State
  )
  if ($Handle -eq [IntPtr]::Zero) { return }
  if (-not [AcompOpmsWin32]::IsWindow($Handle)) { return }
  $cmd = switch ($State) {
    'Minimize' { [AcompOpmsWin32]::SW_SHOWMINNOACTIVE }
    'Maximize' { [AcompOpmsWin32]::SW_MAXIMIZE }
    'Restore' { [AcompOpmsWin32]::SW_RESTORE }
  }
  [void][AcompOpmsWin32]::ShowWindow($Handle, $cmd)
  if ($State -eq 'Maximize') {
    try { [void][AcompOpmsWin32]::SetForegroundWindow($Handle) } catch { }
  }
}

function Get-AcompOpmsHelperProcessIds {
  $ids = New-Object 'System.Collections.Generic.HashSet[int]'

  foreach ($name in @(
      'Docker Desktop',
      'Docker Desktop Backend',
      'com.docker.backend',
      'com.docker.service'
    )) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
      [void]$ids.Add([int]$_.Id)
    }
  }

  # Qualquer processo com janela cujo titulo/nome lembre Docker.
  Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowHandle -ne [IntPtr]::Zero -and (
      $_.ProcessName -match '(?i)docker' -or
      ($_.MainWindowTitle -and $_.MainWindowTitle -match '(?i)docker')
    )
  } | ForEach-Object { [void]$ids.Add([int]$_.Id) }

  # PowerShells do boot/stack (nao o host do Dashboard).
  try {
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" -ErrorAction SilentlyContinue |
      Where-Object {
        $cmd = [string]$_.CommandLine
        if (-not $cmd) { return $false }
        if ($cmd -match '(?i)Abrir-Dashboard\.ps1') { return $false }
        return ($cmd -match '(?i)(Abrir-Tudo|Iniciar-Servidor|Preparar-Rede|Iniciar-Gateway|Local-Export-Api|Dns-Alias|Aplicar-Host|Minimizar-Janelas)')
      } |
      ForEach-Object { [void]$ids.Add([int]$_.ProcessId) }
  } catch { }

  return @($ids)
}

function Invoke-MinimizeAcompOpmsHelpers {
  $count = 0
  foreach ($pidVal in @(Get-AcompOpmsHelperProcessIds)) {
    try {
      $proc = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
      if (-not $proc) { continue }
      $hwnd = $proc.MainWindowHandle
      if ($hwnd -eq [IntPtr]::Zero) { continue }
      Set-AcompOpmsWindowState -Handle $hwnd -State Minimize
      $count++
    } catch { }
  }
  return $count
}

function Get-AcompOpmsDashboardWindowHandles {
  $handles = New-Object 'System.Collections.Generic.List[IntPtr]'
  $profileHint = 'AcompOPMS\dashboard-chrome'
  Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowHandle -ne [IntPtr]::Zero -and (
      $_.ProcessName -match '(?i)^(chrome|msedge)$' -or
      ($_.MainWindowTitle -and $_.MainWindowTitle -match '(?i)(Dashboard|AcompOPMS|OMPS|Servidor)')
    )
  } | ForEach-Object {
    $isDash = $false
    try {
      $cim = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $_.Id) -ErrorAction SilentlyContinue
      $cmd = [string]$cim.CommandLine
      if ($cmd -and ($cmd -match [regex]::Escape($profileHint) -or $cmd -match '--app=')) {
        $isDash = $true
      }
    } catch { }
    if (-not $isDash -and $_.MainWindowTitle -match '(?i)(Dashboard|Servidor OMPS|AcompOPMS)') {
      $isDash = $true
    }
    if ($isDash) { $handles.Add($_.MainWindowHandle) }
  }
  return @($handles)
}

function Invoke-MaximizeAcompOpmsDashboard {
  $count = 0
  foreach ($hwnd in @(Get-AcompOpmsDashboardWindowHandles)) {
    try {
      Set-AcompOpmsWindowState -Handle $hwnd -State Maximize
      $count++
    } catch { }
  }
  return $count
}

function Start-AcompOpmsDashboardMinimizedHost {
  param([string]$ScriptsDir = $PSScriptRoot)
  $dash = Join-Path $ScriptsDir 'Abrir-Dashboard.ps1'
  if (-not (Test-Path -LiteralPath $dash)) { return $null }
  $args = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Minimized',
    '-File', $dash
  )
  return Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WindowStyle Minimized -PassThru
}
