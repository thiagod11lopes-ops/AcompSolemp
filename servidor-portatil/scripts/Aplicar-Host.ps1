# Atualiza IP/hostname no Supabase + server-config.js do frontend (sem rebuild).
# Uso: .\Aplicar-Host.ps1
#      .\Aplicar-Host.ps1 -HostAddress 192.168.0.50

param(
  [string]$HostAddress = ''
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfg = Import-ServidorConfig
if ($HostAddress) {
  $cfg.SERVER_HOST = $HostAddress
  Set-EnvKey (Join-Path (Get-ServidorRoot) 'config.env') 'SERVER_HOST' $HostAddress
}

$dockerDir = $cfg.SUPABASE_DOCKER_DIR
$frontendDir = $cfg.FRONTEND_DIR
$hostName = $cfg.SERVER_HOST
$port = $cfg.SUPABASE_PORT
$publicUrl = "http://${hostName}:${port}"
$anon = Get-AnonKeyFromSupabase $dockerDir

Write-Host "Host: $hostName"
Write-Host "Supabase URL: $publicUrl"

$supabaseEnv = Join-Path $dockerDir '.env'
Set-EnvKey $supabaseEnv 'SUPABASE_PUBLIC_URL' $publicUrl
Set-EnvKey $supabaseEnv 'API_EXTERNAL_URL' "$publicUrl/auth/v1"
Set-EnvKey $supabaseEnv 'SITE_URL' "http://${hostName}:$($cfg.APP_PORT)"
Set-EnvKey $supabaseEnv 'ADDITIONAL_REDIRECT_URLS' (
  "http://${hostName}:$($cfg.APP_PORT),http://${hostName}:$($cfg.APP_PORT)/redefinir-senha,http://localhost:$($cfg.APP_PORT),http://localhost:$($cfg.APP_PORT)/redefinir-senha,http://127.0.0.1:$($cfg.APP_PORT),http://127.0.0.1:$($cfg.APP_PORT)/redefinir-senha"
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
Write-Host 'Pronto. Reinicie o stack se ja estiver rodando:'
Write-Host '  .\Parar-Servidor.ps1'
Write-Host '  .\Iniciar-Servidor.ps1'
Write-Host ''
Write-Host 'Acesso na rede:'
Write-Host "  App:     http://${hostName}:$($cfg.APP_PORT)"
Write-Host "  Studio:  $publicUrl"
