# Publica a CA e o instalador automatico em cliente\www-ca (http://IP/acomp-ca/).
# Sem PowerShell no cliente: Win+R usa cmd+curl (arquivo em %TEMP% nao leva SmartScreen).
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

# install.cmd — so ferramentas do Windows (cmd, curl, certutil, mshta). Sem PowerShell.
$installCmd = @"
@echo off
setlocal
title AcompOPMS - Certificado
set "SERVER=$ip"
set "CA=%TEMP%\AcompOPMS-rootCA.pem"

net session >nul 2>&1
if errorlevel 1 (
  echo Solicitando Administrador...
  mshta "javascript:var s=new ActiveXObject('Shell.Application');s.ShellExecute('%~f0','','','runas',1);close();"
  exit /b
)

echo Baixando certificado...
curl.exe -fsSL --connect-timeout 5 --max-time 20 "http://%SERVER%/acomp-ca/AcompOPMS-rootCA.pem" -o "%CA%"
if errorlevel 1 (
  echo Falha ao baixar a CA. Servidor no ar?
  pause
  exit /b 1
)

echo Instalando certificado confiavel...
certutil.exe -addstore -f Root "%CA%"
if errorlevel 1 (
  echo Falha no certutil.
  pause
  exit /b 1
)

echo OK. Abrindo o sistema...
start "" "https://%SERVER%/"
exit /b 0
"@
Set-Content -LiteralPath (Join-Path $www 'install.cmd') -Value $installCmd.Trim() -Encoding ASCII

# Atalho antigo (mesmo conteudo)
Copy-Item -Force (Join-Path $www 'install.cmd') (Join-Path $www 'Abrir-AcompOPMS.cmd')

# Win+R: baixa o .cmd com curl (sem marca de internet) e executa — sem PowerShell
$runCmd = "cmd /c `"curl.exe -fsSL http://$ip/acomp-ca/install.cmd -o %TEMP%\acomp-install.cmd & call %TEMP%\acomp-install.cmd`""

$html = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AcompOPMS — Acesso seguro</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: #f5f5f7; color: #1d1d1f;
    }
    .card {
      width: min(480px, calc(100vw - 32px));
      background: #fff; border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px; padding: 28px 24px;
    }
    h1 { font-size: 1.25rem; margin: 0 0 8px; letter-spacing: -0.02em; text-align: center; }
    p { margin: 0 0 14px; color: #6e6e73; font-size: .95rem; line-height: 1.45; text-align: center; }
    ol { margin: 0 0 16px 1.1rem; padding: 0; color: #1d1d1f; font-size: .92rem; line-height: 1.55; }
    textarea.cmd {
      display: block; width: 100%; margin: 10px 0 14px; padding: 12px;
      border-radius: 10px; background: #f0f0f2; font-size: .68rem;
      font-family: Consolas, "Courier New", monospace; line-height: 1.35;
      text-align: left; border: 1px solid rgba(0,0,0,.06); resize: none;
      min-height: 72px; color: #1d1d1f;
    }
    button.btn {
      display: inline-flex; width: 100%; align-items: center; justify-content: center;
      border: 0; border-radius: 12px; padding: 12px 18px; font-weight: 700;
      cursor: pointer; color: #fff; font-size: .95rem;
      background: linear-gradient(135deg, #558b71, #3f6b56);
    }
    button.btn:hover { filter: brightness(1.05); }
    .ok { color: #3f6b56; font-weight: 700; font-size: .85rem; text-align: center; min-height: 1.2em; margin-top: 10px; }
    .alt { margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(0,0,0,.06); font-size: .8rem; color: #6e6e73; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Instalar certificado da rede</h1>
    <p>Neste PC o PowerShell pode estar bloqueado. Use o comando abaixo (so CMD do Windows):</p>
    <ol>
      <li>Clique em <strong>Copiar comando</strong></li>
      <li>Pressione <strong>Win + R</strong></li>
      <li>Cole com <strong>Ctrl + V</strong> e aperte <strong>Enter</strong></li>
      <li>Aceite o <strong>UAC</strong> — o sistema abre sozinho</li>
    </ol>
    <textarea class="cmd" id="cmd" readonly rows="3">$runCmd</textarea>
    <button class="btn" type="button" id="copy">Copiar comando</button>
    <div class="ok" id="status"></div>
    <div class="alt">
      Ou, no PC servidor, rode como Administrador:<br />
      <code>servidor-portatil\cliente\Instalar-Certificado-Confianca.cmd</code>
    </div>
  </div>
  <script>
    (function () {
      var box = document.getElementById('cmd');
      var status = document.getElementById('status');
      var btn = document.getElementById('copy');

      function setStatus(msg, ok) {
        status.textContent = msg;
        status.style.color = ok ? '#3f6b56' : '#b3261e';
      }

      function copyLegacy() {
        box.focus();
        box.select();
        box.setSelectionRange(0, box.value.length);
        try { return document.execCommand('copy'); } catch (e) { return false; }
      }

      function copyCommand() {
        if (copyLegacy()) setStatus('Comando copiado. Agora Win+R, Ctrl+V, Enter.', true);
        else {
          box.focus(); box.select();
          setStatus('Texto selecionado — pressione Ctrl+C, depois Win+R e Ctrl+V.', false);
        }
      }

      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        copyCommand();
      });

      window.addEventListener('load', function () {
        box.focus();
        box.select();
        if (copyLegacy()) setStatus('Comando copiado. Pressione Win+R, Ctrl+V e Enter.', true);
        else setStatus('Clique em Copiar comando (ou Ctrl+C).', true);
      });
    })();
  </script>
</body>
</html>
"@
Set-Content -LiteralPath (Join-Path $www 'index.html') -Value $html.Trim() -Encoding UTF8

# Copia local no pacote (USB / Transferir) — sem MOTW
Copy-Item -Force (Join-Path $www 'install.cmd') (Join-Path $root 'cliente\Abrir-Sistema-OMPS.cmd')

# Mantem install.ps1 para PCs sem bloqueio de PowerShell (opcional)
$installPs1 = @"
`$ErrorActionPreference = 'Stop'
`$Server = '$ip'
`$cmd = Join-Path `$env:TEMP 'acomp-install.cmd'
Invoke-WebRequest -Uri "http://`$Server/acomp-ca/install.cmd" -OutFile `$cmd -UseBasicParsing
Start-Process -FilePath `$cmd -Wait
"@
Set-Content -LiteralPath (Join-Path $www 'install.ps1') -Value $installPs1.Trim() -Encoding UTF8

Write-Host ("CA HTTP publicada em: {0}" -f $www)
Write-Host ("Win+R: {0}" -f $runCmd)
Write-Host ("Clientes: http://{0}/" -f $ip)
