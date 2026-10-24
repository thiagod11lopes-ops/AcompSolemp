# Atualiza IP/hostname no Supabase + server-config.js (sem rebuild).
# Uso: .\Aplicar-Host.ps1
#      .\Aplicar-Host.ps1 -HostAddress 192.168.0.50
#      .\Aplicar-Host.ps1 -Alias sistema.acompomps.rede

param(
  [string]$HostAddress = '',
  [string]$Alias = ''
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

function Normalize-ServerAlias([string]$Raw) {
  $a = [string]$Raw
  $a = $a.Trim()
  $a = $a -replace '^\s*https?://', ''
  $a = $a.Split('/')[0]
  $a = $a.Split(':')[0]
  $a = $a.Trim().ToLowerInvariant().TrimEnd('.')
  if (-not $a) { $a = 'sistema.acompomps.rede' }
  return $a
}

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
  $Alias = Normalize-ServerAlias $Alias
  Set-EnvKey $cfgPath 'SERVER_ALIAS' $Alias
  $cfg.SERVER_ALIAS = $Alias
}

$cfg = Import-ServidorConfig
$dockerDir = $cfg.SUPABASE_DOCKER_DIR
$frontendDir = $cfg.FRONTEND_DIR
$ip = $cfg.SERVER_HOST
$alias = Normalize-ServerAlias ([string]$cfg.SERVER_ALIAS)
Set-EnvKey $cfgPath 'SERVER_ALIAS' $alias

# URL publica = HTTPS no nome (gateway :443). Sem :5173 / :8000.
$publicHost = $alias
$publicUrl = "https://${publicHost}"
$httpUrl = "http://${publicHost}"
$appPort = $cfg.APP_PORT
$anon = Get-AnonKeyFromSupabase $dockerDir

Write-Host "IP LAN: $ip"
Write-Host "Alias (exato): $alias"
Write-Host "URL publica: $publicUrl"

$supabaseEnv = Join-Path $dockerDir '.env'
Set-EnvKey $supabaseEnv 'SUPABASE_PUBLIC_URL' $publicUrl
Set-EnvKey $supabaseEnv 'API_EXTERNAL_URL' "$publicUrl/auth/v1"
Set-EnvKey $supabaseEnv 'SITE_URL' $publicUrl
Set-EnvKey $supabaseEnv 'ADDITIONAL_REDIRECT_URLS' (
  "$publicUrl,$publicUrl/redefinir-senha,$publicUrl/login," +
  "$httpUrl,$httpUrl/redefinir-senha,$httpUrl/login," +
  "https://${ip},https://${ip}/redefinir-senha,https://${ip}/login," +
  "http://${ip},http://${ip}/redefinir-senha,http://${ip}/login," +
  "http://${ip}:${appPort},http://${ip}:${appPort}/redefinir-senha," +
  "http://localhost:${appPort},http://127.0.0.1:${appPort},http://127.0.0.1:${appPort}/login"
)

$feEnv = Join-Path $frontendDir '.env'
if (Test-Path $feEnv) {
  Set-EnvKey $feEnv 'VITE_DATA_SOURCE' 'supabase'
  Set-EnvKey $feEnv 'VITE_SUPABASE_URL' $publicUrl
  Set-EnvKey $feEnv 'VITE_SUPABASE_ANON_KEY' $anon
}

$gestorEmailCfg = ''
try {
  . "$PSScriptRoot\Gestor-Config.ps1"
  $gestorEmailCfg = [string](Get-GestorConfig).gestorEmail
} catch { }

$js = @(
  '/* Gerado por Aplicar-Host.ps1 - nao editar a mao */'
  'window.__ACOMP_SERVER__ = {'
  "  dataSource: 'supabase',"
  "  supabaseUrl: '$publicUrl',"
  "  supabaseAnonKey: '$anon',"
  "  serverAlias: '$alias',"
  "  serverIp: '$ip',"
  "  gestorEmail: '$gestorEmailCfg',"
  '};'
) -join [Environment]::NewLine

$jsPath = Join-Path $frontendDir 'public\server-config.js'
Set-Content -Path $jsPath -Value $js -Encoding UTF8
Write-Host "Atualizado: $jsPath"

$distJs = Join-Path $frontendDir 'dist\server-config.js'
if (Test-Path (Join-Path $frontendDir 'dist')) {
  Set-Content -Path $distJs -Value $js -Encoding UTF8
}

$clienteDir = Join-Path (Get-ServidorRoot) 'cliente'
New-Item -ItemType Directory -Force -Path $clienteDir | Out-Null
@(
  "ALIAS=$alias"
  "IP=$ip"
  "APP_PORT=443"
  "PUBLIC_URL=https://$alias"
) | Set-Content -Path (Join-Path $clienteDir 'hosts-map.env') -Encoding ASCII

# hosts local (esta maquina)
$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
try {
  $marker = '# acompopms-alias'
  $lines = @()
  if (Test-Path $hostsPath) {
    $lines = @(Get-Content $hostsPath -ErrorAction SilentlyContinue | Where-Object { $_ -notmatch [regex]::Escape($marker) })
  }
  $lines += "$ip`t$alias`t$marker"
  Set-Content -Path $hostsPath -Value $lines -Encoding ASCII
} catch {
  Write-Host "Aviso hosts local: $($_.Exception.Message)"
}

Write-Host ''
Write-Host 'Nos outros PCs: Instalar-Certificado-Confianca.cmd (Admin, uma vez), depois digite EXATAMENTE:'
Write-Host "  $alias"
