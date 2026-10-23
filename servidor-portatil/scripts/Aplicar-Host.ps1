# Atualiza IP/hostname no Supabase + server-config.js do frontend (sem rebuild).
# Uso: .\Aplicar-Host.ps1
#      .\Aplicar-Host.ps1 -HostAddress 192.168.0.50
#      .\Aplicar-Host.ps1 -Alias sistema.acompomps.rede

param(
  [string]$HostAddress = '',
  [string]$Alias = ''
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfgPath = Join-Path (Get-ServidorRoot) 'config.env'
$cfg = Import-ServidorConfig

if (-not $HostAddress) {
  $detected = Get-PreferredLanIPv4
  if ($detected) { $HostAddress = $detected }
}

if ($HostAddress) {
  $cfg.SERVER_HOST = $HostAddress
  Set-EnvKey $cfgPath 'SERVER_HOST' $HostAddress
}

if ($Alias) {
  $Alias = $Alias.Trim().ToLowerInvariant().TrimEnd('.')
  Set-EnvKey $cfgPath 'SERVER_ALIAS' $Alias
  $cfg.SERVER_ALIAS = $Alias
}

$cfg = Import-ServidorConfig
$dockerDir = $cfg.SUPABASE_DOCKER_DIR
$frontendDir = $cfg.FRONTEND_DIR
$ip = $cfg.SERVER_HOST
$alias = [string]$cfg.SERVER_ALIAS
if (-not $alias) { $alias = 'sistema.acompomps.rede' }
$alias = $alias.Trim().ToLowerInvariant().TrimEnd('.')

# URLs publicas usam o nome amigavel; IP fica de reserva nos redirects
$publicHost = $alias
$port = $cfg.SUPABASE_PORT
$appPort = $cfg.APP_PORT
$publicUrl = "http://${publicHost}:${port}"
$anon = Get-AnonKeyFromSupabase $dockerDir

Write-Host "IP LAN: $ip"
Write-Host "Alias:  $alias"
Write-Host "Supabase URL: $publicUrl"

$supabaseEnv = Join-Path $dockerDir '.env'
Set-EnvKey $supabaseEnv 'SUPABASE_PUBLIC_URL' $publicUrl
Set-EnvKey $supabaseEnv 'API_EXTERNAL_URL' "$publicUrl/auth/v1"
Set-EnvKey $supabaseEnv 'SITE_URL' "http://${publicHost}:${appPort}"
Set-EnvKey $supabaseEnv 'ADDITIONAL_REDIRECT_URLS' (
  "http://${publicHost}:${appPort},http://${publicHost}:${appPort}/redefinir-senha," +
  "http://${ip}:${appPort},http://${ip}:${appPort}/redefinir-senha," +
  "http://localhost:${appPort},http://localhost:${appPort}/redefinir-senha," +
  "http://127.0.0.1:${appPort},http://127.0.0.1:${appPort}/redefinir-senha"
)

$feEnv = Join-Path $frontendDir '.env'
if (Test-Path $feEnv) {
  Set-EnvKey $feEnv 'VITE_DATA_SOURCE' 'supabase'
  Set-EnvKey $feEnv 'VITE_SUPABASE_URL' $publicUrl
  Set-EnvKey $feEnv 'VITE_SUPABASE_ANON_KEY' $anon
}

$js = @(
  '/* Gerado por Aplicar-Host.ps1 - nao editar a mao */'
  'window.__ACOMP_SERVER__ = {'
  "  dataSource: 'supabase',"
  "  supabaseUrl: '$publicUrl',"
  "  supabaseAnonKey: '$anon',"
  "  serverAlias: '$alias',"
  "  serverIp: '$ip',"
  '};'
) -join [Environment]::NewLine

$jsPath = Join-Path $frontendDir 'public\server-config.js'
Set-Content -Path $jsPath -Value $js -Encoding UTF8
Write-Host "Atualizado: $jsPath"

$distJs = Join-Path $frontendDir 'dist\server-config.js'
if (Test-Path (Join-Path $frontendDir 'dist')) {
  Set-Content -Path $distJs -Value $js -Encoding UTF8
  Write-Host "Atualizado: $distJs"
}

Write-Host ''
Write-Host 'Acesso:'
Write-Host "  Nome:  http://${alias}:${appPort}"
Write-Host "  IP:    http://${ip}:${appPort}"
Write-Host "  Studio nome: $publicUrl"
