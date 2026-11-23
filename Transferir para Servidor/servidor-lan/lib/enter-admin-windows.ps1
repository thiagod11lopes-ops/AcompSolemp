# Relanca o script chamador elevado no Windows PowerShell 5.1.
# Start-Process -ArgumentList em lista parte caminhos com espaco e o PowerShell
# termina com -196608 (0xFFFD0000) antes de executar o arquivo.

function Test-AcompSolempAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-AcompSolempAdminRelaunch {
  param([Parameter(Mandatory = $true)][string]$ScriptPath)

  if (Test-AcompSolempAdministrator) { return }

  $dir = Join-Path $env:TEMP ('acomopms-elevated-' + [guid]::NewGuid().ToString('n'))
  New-Item -ItemType Directory -Path $dir | Out-Null
  $log = Join-Path $dir 'output.log'
  $codeFile = Join-Path $dir 'exit.txt'
  $runner = Join-Path $dir 'runner.ps1'
  $quotedScript = $ScriptPath.Replace("'", "''")
  $quotedLog = $log.Replace("'", "''")
  $quotedCode = $codeFile.Replace("'", "''")
  @"
`$ErrorActionPreference = 'Continue'
`$target = '$quotedScript'
`$log = '$quotedLog'
`$codeFile = '$quotedCode'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File `$target *>&1 | Out-File -FilePath `$log -Encoding utf8
`$code = `$LASTEXITCODE
if (`$null -eq `$code) { `$code = 0 }
Set-Content -LiteralPath `$codeFile -Value `$code -Encoding ascii
exit 0
"@ | Set-Content -LiteralPath $runner -Encoding ASCII

  $arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $runner + '"'
  try {
    Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -Verb RunAs -Wait | Out-Null
  } catch {
    Write-Output $_.Exception.Message
    Write-Output 'Confirme o prompt do Controle de Conta de Usuario (Administrador) para aplicar a regra de firewall.'
    exit 1223
  }

  if (-not (Test-Path -LiteralPath $codeFile)) {
    Write-Output 'O processo elevado nao gravou codigo de saida. Confirme o prompt do Controle de Conta de Usuario (Administrador).'
    exit 1223
  }
  if (Test-Path -LiteralPath $log) {
    $text = Get-Content -LiteralPath $log -Raw -ErrorAction SilentlyContinue
    if ($text) { Write-Output $text }
  }
  $codeText = (Get-Content -LiteralPath $codeFile -Raw).Trim()
  if ($codeText -notmatch '^\d+$') {
    Write-Output ('Codigo de saida do processo elevado: ' + $codeText)
    exit 1
  }
  exit ([int]$codeText)
}
