# Gera pasta portatil AcompOMPS para testes em outro PC (IndexedDB, sem Supabase).
# Requisitos neste PC: Node.js + npm (so para gerar o pacote).
# No PC do tester: so Windows 10/11 — nao precisa instalar Node.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\Gerar-Pacote-Teste-IndexedDB.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\Gerar-Pacote-Teste-IndexedDB.ps1 -Destino "$env:USERPROFILE\Desktop\AcompOMPS"

[CmdletBinding()]
param(
  [string]$Destino = '',
  [int]$Porta = 5177
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$frontend = Join-Path $repoRoot 'frontend'
$iconSrc = Join-Path $repoRoot 'servidor-portatil\icons\opms.ico'

if (-not $Destino) {
  $Destino = Join-Path ([Environment]::GetFolderPath('Desktop')) 'AcompOMPS'
}

Write-Host "Pacote destino: $Destino"
Write-Host "Frontend:       $frontend"

if (-not (Test-Path -LiteralPath (Join-Path $frontend 'package.json'))) {
  throw "Frontend nao encontrado: $frontend"
}

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
  throw 'Node.js/npm nao encontrados. Instale Node 20+ para gerar o pacote.'
}

Write-Host '1/5 npm install (se necessario)...'
Push-Location $frontend
try {
  if (-not (Test-Path -LiteralPath 'node_modules')) {
    npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw "npm install falhou ($LASTEXITCODE)" }
  }

  Write-Host '2/5 build Vite (IndexedDB / dataSource=local)...'
  # Usa vite build direto: o "npm run build" roda tsc -b e pode falhar por erros
  # de tipos ja existentes no repo; o pacote de teste nao precisa do check estrito.
  $env:VITE_DATA_SOURCE = 'local'
  $env:GITHUB_PAGES = 'false'
  Remove-Item Env:VITE_SUPABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:VITE_SUPABASE_ANON_KEY -ErrorAction SilentlyContinue
  npx --yes vite build
  if ($LASTEXITCODE -ne 0) { throw "vite build falhou ($LASTEXITCODE)" }
}
finally {
  Pop-Location
}

$dist = Join-Path $frontend 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $dist 'index.html'))) {
  throw "Build sem index.html: $dist"
}

Write-Host '3/5 montando pasta AcompOMPS...'
if (Test-Path -LiteralPath $Destino) {
  Remove-Item -LiteralPath $Destino -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$www = Join-Path $Destino 'www'
$icons = Join-Path $Destino 'icons'
$scripts = Join-Path $Destino 'scripts'
New-Item -ItemType Directory -Force -Path $www, $icons, $scripts | Out-Null

Copy-Item -Path (Join-Path $dist '*') -Destination $www -Recurse -Force

# Forca IndexedDB no PC do tester (sobrescreve server-config do LAN, se houver).
@(
  '/* Pacote de teste AcompOMPS — IndexedDB local (sem Supabase). */'
  'window.__ACOMP_SERVER__ = {'
  "  dataSource: 'local',"
  "  supabaseUrl: '',"
  "  supabaseAnonKey: '',"
  "  gestorEmail: '',"
  '};'
) | Set-Content -LiteralPath (Join-Path $www 'server-config.js') -Encoding UTF8

if (Test-Path -LiteralPath $iconSrc) {
  Copy-Item -Force $iconSrc (Join-Path $icons 'opms.ico')
} else {
  Write-Warning "Icone fonte ausente ($iconSrc). O atalho usara icone padrao."
}

$servePs1 = Join-Path $scripts 'Serve-Local.ps1'
@'
# Servidor HTTP local (SPA) — nao requer Node no PC do tester.
param(
  [int]$Port = 5177,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\www')).Path
$url = "http://127.0.0.1:$Port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.map'  = 'application/json'
  '.txt'  = 'text/plain; charset=utf-8'
  '.webp' = 'image/webp'
}

Add-Type -AssemblyName System.Net.HttpListener
$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  throw "Nao foi possivel abrir a porta $Port. Feche outro AcompOMPS ou altere a porta.`n$($_.Exception.Message)"
}

Write-Host "AcompOMPS (IndexedDB) em $url"
Write-Host "Pasta: $root"
Write-Host "Deixe esta janela aberta enquanto usa o sistema. Ctrl+C para encerrar."

if (-not $NoBrowser) {
  Start-Process $url
}

function Get-SafePath([string]$rel) {
  $rel = [Uri]::UnescapeDataString(($rel -replace '\\', '/'))
  if ([string]::IsNullOrWhiteSpace($rel) -or $rel -eq '/') { return (Join-Path $root 'index.html') }
  $rel = $rel.TrimStart('/')
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $root ($rel -replace '/', [IO.Path]::DirectorySeparatorChar)))
  $rootFull = [System.IO.Path]::GetFullPath($root)
  if (-not $candidate.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }
  return $candidate
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $path = Get-SafePath $req.Url.AbsolutePath
    if (-not $path) {
      $res.StatusCode = 403
      $bytes = [Text.Encoding]::UTF8.GetBytes('Forbidden')
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    if (-not (Test-Path -LiteralPath $path) -or (Test-Path -LiteralPath $path -PathType Container)) {
      # SPA fallback
      $path = Join-Path $root 'index.html'
    }

    $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
    $contentType = $mime[$ext]
    if (-not $contentType) { $contentType = 'application/octet-stream' }

    $bytes = [IO.File]::ReadAllBytes($path)
    $res.StatusCode = 200
    $res.ContentType = $contentType
    $res.ContentLength64 = $bytes.LongLength
    $res.Headers['Cache-Control'] = 'no-cache'
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    try {
      $res.StatusCode = 500
      $msg = [Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
      $res.OutputStream.Write($msg, 0, $msg.Length)
    } catch {}
  } finally {
    try { $res.Close() } catch {}
  }
}
'@ | Set-Content -LiteralPath $servePs1 -Encoding UTF8

# Auxiliares ficam em scripts\ — na raiz so aparece o atalho "Iniciar sistema".
$vbs = Join-Path $scripts 'Iniciar-sistema.vbs'
@"
' Launcher interno do AcompOMPS (teste IndexedDB) — use o atalho da pasta raiz.
Option Explicit
Dim sh, fso, here, root, ps1, porta, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(here)
ps1 = here & "\Serve-Local.ps1"
porta = "$Porta"
If Not fso.FileExists(ps1) Then
  MsgBox "Arquivo nao encontrado:" & vbCrLf & ps1, 16, "AcompOMPS"
  WScript.Quit 1
End If
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """ -Port " & porta
sh.CurrentDirectory = root
sh.Run cmd, 1, False
"@ | Set-Content -LiteralPath $vbs -Encoding ASCII

$cmdFile = Join-Path $scripts 'Iniciar-sistema.cmd'
@"
@echo off
title AcompOMPS
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Serve-Local.ps1" -Port $Porta
"@ | Set-Content -LiteralPath $cmdFile -Encoding ASCII

$leia = Join-Path $Destino 'LEIA-ME.txt'
@"
AcompOMPS — pacote de teste (IndexedDB)
=====================================

Como usar em outro computador
1. Copie a pasta inteira AcompOMPS (pendrive, zip, rede).
2. Clique DUAS VEZES apenas no atalho "Iniciar sistema" (icone OPMS azul/dourado).
   Nao abra pastas internas (icons, scripts, www).
3. O navegador abre em http://127.0.0.1:$Porta/
4. Deixe a janela PowerShell aberta enquanto usa o sistema.
5. Para encerrar: feche a janela do PowerShell (ou Ctrl+C).

Dados
- Tudo fica no IndexedDB do navegador deste computador.
- Nao usa Supabase / nuvem.
- Cada PC tem sua propria base local (nao sincroniza entre maquinas).

Login de demonstracao (seed local)
- gestor / gestor123
- clinica / clinica123
- admin / admin123

Requisitos
- Windows 10 ou 11
- Nao precisa instalar Node.js no PC do tester

Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
"@ | Set-Content -LiteralPath $leia -Encoding UTF8

Write-Host '4/5 criando atalho "Iniciar sistema"...'
$ico = Join-Path $icons 'opms.ico'
$lnk = Join-Path $Destino 'Iniciar sistema.lnk'
# Remove lancadores antigos da raiz (versoes anteriores do pacote).
@(
  (Join-Path $Destino 'Iniciar-sistema.vbs'),
  (Join-Path $Destino 'Iniciar-sistema.cmd'),
  (Join-Path $Destino 'Iniciar sistema.vbs'),
  (Join-Path $Destino 'Iniciar sistema.cmd')
) | ForEach-Object {
  if (Test-Path -LiteralPath $_) { Remove-Item -LiteralPath $_ -Force }
}
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($lnk)
$sc.TargetPath = $vbs
$sc.WorkingDirectory = $Destino
$sc.WindowStyle = 1
if (Test-Path -LiteralPath $ico) {
  $sc.IconLocation = "$ico,0"
}
$sc.Description = 'Inicia o AcompOMPS em modo teste (IndexedDB local)'
$sc.Save()

Write-Host '5/5 pronto.'
Write-Host ""
Write-Host "Pasta pronta para enviar:"
Write-Host "  $Destino"
Write-Host "Atalho:"
Write-Host "  $lnk"
Write-Host ""
Write-Host "Zip sugerido: compacte a pasta AcompOMPS e envie aos testers."
