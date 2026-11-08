# Publica a CA e o instalador automatico em cliente\www-ca (servido em http://IP/acomp-ca/).
# Win+R usa -EncodedCommand (sem | nem aspas) — o | no Executar quebra o PowerShell.
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

# Comando curto para EncodedCommand / elevacao (sem pipe |)
$bootExpr = "iex (irm http://$ip/acomp-ca/install.ps1)"
$bootEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($bootExpr))
$runCmd = "powershell -NoP -EP Bypass -EncodedCommand $bootEncoded"
if ($runCmd.Length -gt 240) {
  throw "Comando Win+R longo demais ($($runCmd.Length)). Reduza o IP/caminho."
}

# Script remoto (roda na memoria)
$installPs1 = @"
# AcompOPMS — instala CA da rede local e abre o sistema
`$ErrorActionPreference = 'Stop'
`$Server = '$ip'
`$CaUrl = "http://`$Server/acomp-ca/AcompOPMS-rootCA.pem"
`$Https = "https://`$Server/"
`$BootEncoded = '$bootEncoded'

function Test-IsAdmin {
  return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  Write-Host 'Solicitando Administrador (UAC)...'
  `$p = Start-Process -FilePath "`$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" ``
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', `$BootEncoded) ``
    -Verb RunAs -Wait -PassThru
  if (`$null -eq `$p -or `$p.ExitCode -ne 0) { throw 'Instalacao cancelada ou falhou.' }
  exit 0
}

`$ca = Join-Path `$env:TEMP 'AcompOPMS-rootCA.pem'
Write-Host "Baixando CA: `$CaUrl"
`$ok = `$false
try {
  & curl.exe -fsSL --connect-timeout 5 --max-time 20 `$CaUrl -o `$ca
  if (`$LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath `$ca)) { `$ok = `$true }
} catch { }
if (-not `$ok) {
  # Fallback sem curl.exe
  Invoke-WebRequest -Uri `$CaUrl -OutFile `$ca -UseBasicParsing
}
if (-not (Test-Path -LiteralPath `$ca)) { throw 'Falha ao baixar a CA.' }

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

# CMD legado: tambem usa EncodedCommand (sem | )
$cmd = @"
@echo off
title AcompOPMS - Certificado
echo Instalando certificado da rede local...
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -EncodedCommand $bootEncoded
if errorlevel 1 (
  echo.
  echo Se o Windows bloqueou, use a pagina http://$ip/ : Copiar comando, Win+R, Enter.
  pause
)
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
      min-height: 88px; color: #1d1d1f;
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
    <p>Use o comando abaixo no <strong>Executar</strong> do Windows (sem baixar arquivo):</p>
    <ol>
      <li>Clique em <strong>Copiar comando</strong></li>
      <li>Pressione <strong>Win + R</strong></li>
      <li>Cole com <strong>Ctrl + V</strong> e aperte <strong>Enter</strong></li>
      <li>Aceite o <strong>UAC</strong> — o sistema abre sozinho</li>
    </ol>
    <textarea class="cmd" id="cmd" readonly rows="4">$runCmd</textarea>
    <button class="btn" type="button" id="copy">Copiar comando</button>
    <div class="ok" id="status"></div>
    <div class="alt">
      Alternativa: rode como Admin o arquivo em<br />
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
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(box.value).then(function () {
            setStatus('Comando copiado. Agora Win+R, Ctrl+V, Enter.', true);
          }).catch(function () {
            if (copyLegacy()) setStatus('Comando copiado. Agora Win+R, Ctrl+V, Enter.', true);
            else setStatus('Selecione o texto e pressione Ctrl+C.', false);
          });
        }
        if (copyLegacy()) setStatus('Comando copiado. Agora Win+R, Ctrl+V, Enter.', true);
        else {
          box.focus(); box.select();
          setStatus('Texto selecionado — Ctrl+C, depois Win+R e Ctrl+V.', false);
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

$localCmd = Join-Path $root 'cliente\Abrir-Sistema-OMPS.cmd'
@"
@echo off
title AcompOPMS
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -EncodedCommand $bootEncoded
if errorlevel 1 pause
"@ | Set-Content -LiteralPath $localCmd -Encoding ASCII

Write-Host ("CA HTTP publicada em: {0}" -f $www)
Write-Host ("Win+R ($($runCmd.Length) chars): {0}" -f $runCmd)
Write-Host ("Clientes: http://{0}/" -f $ip)
