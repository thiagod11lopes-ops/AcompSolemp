# Publica a CA e o instalador automatico em cliente\www-ca (servido em http://IP/acomp-ca/).
# Evita SmartScreen: fluxo principal e Win+R + irm|iex (sem baixar .cmd).
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

# Script remoto (roda na memoria — nao gera arquivo baixado com bloqueio do Windows)
$installPs1 = @"
# AcompOPMS — instala CA da rede local e abre o sistema (uso: irm ... | iex)
`$ErrorActionPreference = 'Stop'
`$Server = '$ip'
`$CaUrl = "http://`$Server/acomp-ca/AcompOPMS-rootCA.pem"
`$Https = "https://`$Server/"

function Test-IsAdmin {
  return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  Write-Host 'Solicitando Administrador (UAC)...'
  `$arg = "-NoProfile -ExecutionPolicy Bypass -Command `"irm http://$ip/acomp-ca/install.ps1 | iex`""
  `$p = Start-Process -FilePath powershell.exe -ArgumentList `$arg -Verb RunAs -Wait -PassThru
  if (`$p.ExitCode -ne 0) { throw 'Instalacao cancelada ou falhou.' }
  exit 0
}

`$ca = Join-Path `$env:TEMP 'AcompOPMS-rootCA.pem'
Write-Host "Baixando CA: `$CaUrl"
& curl.exe -fsSL --connect-timeout 5 --max-time 20 `$CaUrl -o `$ca
if (`$LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath `$ca)) { throw 'Falha ao baixar a CA.' }

`$dump = & certutil.exe -dump `$ca 2>&1 | Out-String
`$hash = `$null
if (`$dump -match 'Cert Hash\(sha1\):\s*([a-fA-F0-9 ]+)') {
  `$hash = ((`$Matches[1] -replace '\s','').ToUpperInvariant())
}
`$store = & certutil.exe -store Root 2>&1 | Out-String
if (-not (`$hash -and `$store.ToUpperInvariant().Contains(`$hash))) {
  Write-Host 'Instalando certificado na loja Raiz...'
  & certutil.exe -addstore -f Root `$ca | Out-Null
  if (`$LASTEXITCODE -ne 0) { throw 'certutil falhou.' }
} else {
  Write-Host 'Certificado ja estava confiado.'
}

Write-Host "Abrindo `$Https"
Start-Process `$Https | Out-Null
"@
Set-Content -LiteralPath (Join-Path $www 'install.ps1') -Value $installPs1.Trim() -Encoding UTF8

# CMD legado (pode cair no SmartScreen se baixado pelo Chrome)
$cmd = @"
@echo off
title AcompOPMS - Certificado
echo.
echo Este arquivo baixado pode ser bloqueado pelo Windows.
echo Prefira o metodo da pagina: Win+R e cole o comando.
echo.
echo Tentando instalar mesmo assim...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "irm http://$ip/acomp-ca/install.ps1 | iex"
if errorlevel 1 pause
"@
Set-Content -LiteralPath (Join-Path $www 'Abrir-AcompOPMS.cmd') -Value $cmd.Trim() -Encoding ASCII

$runCmd = "powershell -NoP -EP Bypass -C `"irm http://$ip/acomp-ca/install.ps1 | iex`""

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
      border-radius: 10px; background: #f0f0f2; font-size: .72rem;
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
    .alt a { color: #3f6b56; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Instalar certificado da rede</h1>
    <p>O Windows bloqueia o arquivo <strong>.cmd</strong> baixado do navegador. Use este metodo (sem download):</p>
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
      Se ainda quiser o arquivo: <a href="Abrir-AcompOPMS.cmd">Abrir-AcompOPMS.cmd</a><br />
      No bloqueio do Windows: <strong>Mais informacoes</strong> → <strong>Executar assim mesmo</strong>
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
        var ok = false;
        try {
          ok = document.execCommand('copy');
        } catch (e) {
          ok = false;
        }
        return ok;
      }

      function copyCommand() {
        var text = box.value;
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(text).then(function () {
            setStatus('Comando copiado. Agora Win+R, Ctrl+V, Enter.', true);
          }).catch(function () {
            if (copyLegacy()) {
              setStatus('Comando copiado. Agora Win+R, Ctrl+V, Enter.', true);
            } else {
              setStatus('Selecione o texto acima e pressione Ctrl+C.', false);
            }
          });
        }
        if (copyLegacy()) {
          setStatus('Comando copiado. Agora Win+R, Ctrl+V, Enter.', true);
        } else {
          box.focus();
          box.select();
          setStatus('Texto selecionado — pressione Ctrl+C, depois Win+R e Ctrl+V.', false);
        }
      }

      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        copyCommand();
      });

      // Em HTTP a API moderna falha; ja seleciona o texto para facilitar Ctrl+C
      window.addEventListener('load', function () {
        box.focus();
        box.select();
        if (copyLegacy()) {
          setStatus('Comando copiado. Pressione Win+R, Ctrl+V e Enter.', true);
        } else {
          setStatus('Clique em Copiar comando (ou Ctrl+C com o texto selecionado).', true);
        }
      });
    })();
  </script>
</body>
</html>
"@
Set-Content -LiteralPath (Join-Path $www 'index.html') -Value $html.Trim() -Encoding UTF8

# Atalho local (pen drive / Transferir Servidor) — sem SmartScreen de download
$localCmd = Join-Path $root 'cliente\Abrir-Sistema-OMPS.cmd'
@"
@echo off
title AcompOPMS
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "irm http://$ip/acomp-ca/install.ps1 | iex"
if errorlevel 1 pause
"@ | Set-Content -LiteralPath $localCmd -Encoding ASCII

Write-Host ("CA HTTP publicada em: {0}" -f $www)
Write-Host ("Clientes: http://{0}/  → Copiar comando → Win+R → Enter" -f $ip)
