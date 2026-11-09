# Gera o icone e o atalho "Iniciar Servidor OMPS.lnk" na pasta servidor-portatil.
# Rode uma vez apos copiar o pacote para outro PC.

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$iconsDir = Join-Path $root 'icons'
$icoPath = Join-Path $iconsDir 'opms.ico'
$vbsPath = Join-Path $root 'Iniciar Servidor OMPS.vbs'
$lnkPath = Join-Path $root 'Iniciar Servidor OMPS.lnk'

New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

if (-not (Test-Path $vbsPath)) {
  throw "Arquivo nao encontrado: $vbsPath"
}

# --- icone simples (azul + texto OPMS) ---
Add-Type -AssemblyName System.Drawing

function New-OpmsIcon([string]$Path) {
  $sizes = @(16, 32, 48, 256)
  $ms = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter $ms

  # ICONDIR
  $bw.Write([uint16]0)              # reserved
  $bw.Write([uint16]1)              # type icon
  $bw.Write([uint16]$sizes.Count)   # count

  $imageStreams = @()
  foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 15, 76, 129))
    $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 232, 168, 56))
    $white = [System.Drawing.Brushes]::White

    $pad = [Math]::Max(1, [int]($size * 0.08))
    $g.FillEllipse($bg, $pad, $pad, $size - 2 * $pad, $size - 2 * $pad)

    $dot = [Math]::Max(2, [int]($size * 0.18))
    $g.FillEllipse($accent, [int](($size - $dot) / 2), [int]($size * 0.18), $dot, $dot)

    if ($size -ge 32) {
      $fontSize = [Math]::Max(6, [int]($size * 0.22))
      $font = New-Object System.Drawing.Font 'Segoe UI', $fontSize, ([System.Drawing.FontStyle]::Bold)
      $sf = New-Object System.Drawing.StringFormat
      $sf.Alignment = [System.Drawing.StringAlignment]::Center
      $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
      $rect = New-Object System.Drawing.RectangleF 0, ($size * 0.35), $size, ($size * 0.5)
      $g.DrawString('OPMS', $font, $white, $rect, $sf)
      $font.Dispose()
      $sf.Dispose()
    }

    $g.Dispose()
    $bg.Dispose()
    $accent.Dispose()

    $png = New-Object System.IO.MemoryStream
    $bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $imageStreams += , @($size, $png)
  }

  $offset = 6 + (16 * $sizes.Count)
  foreach ($entry in $imageStreams) {
    $size = $entry[0]
    $png = $entry[1]
    $bytes = $png.ToArray()
    $bw.Write([byte]$(if ($size -ge 256) { 0 } else { $size })) # width
    $bw.Write([byte]$(if ($size -ge 256) { 0 } else { $size })) # height
    $bw.Write([byte]0)   # colors
    $bw.Write([byte]0)   # reserved
    $bw.Write([uint16]1) # planes
    $bw.Write([uint16]32)# bitcount
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $bytes.Length
  }

  foreach ($entry in $imageStreams) {
    $bytes = $entry[1].ToArray()
    $bw.Write($bytes)
    $entry[1].Dispose()
  }

  $bw.Flush()
  [System.IO.File]::WriteAllBytes($Path, $ms.ToArray())
  $bw.Dispose()
  $ms.Dispose()
}

New-OpmsIcon $icoPath

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($lnkPath)
$sc.TargetPath = $vbsPath
$sc.WorkingDirectory = $root
$sc.WindowStyle = 1
$sc.IconLocation = "$icoPath,0"
$sc.Description = 'Inicia Docker, Supabase e o app AcompOPMS na rede'
$sc.Save()

Write-Host "Atalho criado:"
Write-Host "  $lnkPath"
Write-Host "Icone:"
Write-Host "  $icoPath"
