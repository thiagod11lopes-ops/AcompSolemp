# Publica a CA e o instalador automatico em cliente\www-ca (servido em http://IP/acomp-ca/).
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$root = Get-ServidorRoot
$cfg = Import-ServidorConfig
$ip = [string]$cfg.SERVER_HOST
if (-not $ip) { $ip = Get-PreferredLanIPv4 }
if (-not $ip) { $ip = '127.0.0.1' }

$www = Join-Path $root 'cliente\www-ca'
New-Item -ItemType Directory -Force -Path $www | Out-Null

$caSrc = Join-Path $root 'cliente\AcompOPMS-rootCA.pem'
if (-not (Test-Path -LiteralPath $caSrc)) {
  throw "CA ausente: $caSrc (rode Preparar-Https.ps1 antes)."
}
Copy-Item -Force $caSrc (Join-Path $www 'AcompOPMS-rootCA.pem')

# CMD auto-contido: UAC -> baixa CA via HTTP -> instala -> abre HTTPS
$cmd = @"
@echo off
title AcompOPMS - Certificado automatico
net session >nul 2>&1
if errorlevel 1 (
  echo Solicitando Administrador para instalar o certificado...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "SERVER=$ip"
set "CA=%TEMP%\AcompOPMS-rootCA.pem"
echo Baixando certificado de http://%SERVER%/acomp-ca/ ...
curl.exe -fsSL --connect-timeout 5 --max-time 20 "http://%SERVER%/acomp-ca/AcompOPMS-rootCA.pem" -o "%CA%"
if errorlevel 1 (
  echo Falha ao baixar a CA. Confira se o servidor esta no ar.
  pause
  exit /b 1
)

echo Instalando certificado confiavel...
certutil.exe -addstore -f Root "%CA%" >nul
if errorlevel 1 (
  echo Falha no certutil.
  pause
  exit /b 1
)

echo OK. Abrindo o sistema...
start "" "https://%SERVER%/"
exit /b 0
"@
Set-Content -LiteralPath (Join-Path $www 'Abrir-AcompOPMS.cmd') -Value $cmd.Trim() -Encoding ASCII

$html = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AcompOPMS — Acesso seguro</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: Inter, Segoe UI, system-ui, sans-serif;
      background: #f5f5f7; color: #1d1d1f;
    }
    .card {
      width: min(440px, calc(100vw - 32px));
      background: #fff; border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px; padding: 28px 24px; text-align: center;
    }
    .icon {
      width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 18px;
      display: grid; place-items: center; background: rgba(85,139,113,.12); font-size: 28px;
    }
    h1 { font-size: 1.25rem; margin: 0 0 8px; letter-spacing: -0.02em; }
    p { margin: 0 0 18px; color: #6e6e73; font-size: .95rem; line-height: 1.45; }
    a.btn, button.btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      border: 0; border-radius: 12px; padding: 12px 18px; font-weight: 700;
      text-decoration: none; cursor: pointer; color: #fff;
      background: linear-gradient(135deg, #558b71, #3f6b56);
    }
    .hint { margin-top: 14px; font-size: .8rem; color: #6e6e73; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>Preparando acesso seguro</h1>
    <p>Para remover o aviso “Sua conexão não é particular”, o certificado da rede local será instalado automaticamente neste computador.</p>
    <a class="btn" id="go" href="Abrir-AcompOPMS.cmd" download="Abrir-AcompOPMS.cmd">Instalar e abrir o sistema</a>
    <p class="hint">Aceite o UAC do Windows. Depois o navegador abre em https://$ip/</p>
  </div>
  <script>
    // Dispara o download automaticamente na primeira visita
    window.addEventListener('load', function () {
      var a = document.getElementById('go');
      try { a.click(); } catch (e) {}
    });
  </script>
</body>
</html>
"@
Set-Content -LiteralPath (Join-Path $www 'index.html') -Value $html.Trim() -Encoding UTF8

Write-Host ("CA HTTP publicada em: {0}" -f $www)
Write-Host ("Clientes: http://{0}/acomp-ca/  ou  http://{0}/" -f $ip)
