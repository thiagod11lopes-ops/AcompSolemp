# Exporta os dados do AcompOPMS para AcompSolemp\Dados em Excel multi-abas
# (cabecalhos com fundo opaco, filtros, congelamento) + snapshot JSON para recarga.
#
# Uso: .\Exportar-Dados-Excel.ps1

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
. "$PSScriptRoot\Gestor-Config.ps1"

function Get-AcompSolempRoot {
  $root = Get-ServidorRoot
  $parent = Split-Path $root -Parent
  if (Test-Path (Join-Path $parent 'frontend')) { return $parent }
  if (Test-Path (Join-Path $root '..\frontend')) {
    return (Resolve-Path (Join-Path $root '..')).Path
  }
  return $parent
}

function Get-AppStatePayloadObject {
  $name = 'supabase-db'
  docker inspect $name 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Container supabase-db nao esta em execucao. Inicie o servidor OMPS.' }

  $id = [guid]::NewGuid().ToString('N')
  $remote = "/tmp/acomp-payload-$id.json"
  $remoteSql = "/tmp/acomp-payload-$id.sql"
  $local = Join-Path $env:TEMP "acomp-payload-$id.json"
  $tmpSql = Join-Path $env:TEMP "acomp-payload-$id.sql"
  $utf8 = New-Object System.Text.UTF8Encoding $false
  try {
    # \copy grava no filesystem do cliente psql (dentro do container) sem exigir superuser COPY.
    $copySql = "\copy (SELECT payload::text FROM public.app_state ORDER BY updated_at DESC NULLS LAST LIMIT 1) TO '$remote'`n"
    [IO.File]::WriteAllText($tmpSql, $copySql, $utf8)
    docker cp $tmpSql "${name}:$remoteSql" 1>$null
    $p = Start-Process -FilePath 'docker' -ArgumentList @(
      'exec', '-e', 'PGCLIENTENCODING=UTF8', $name,
      'psql', '-U', 'postgres', '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1', '-f', $remoteSql
    ) -Wait -PassThru -NoNewWindow
    if ($p.ExitCode -ne 0) { throw 'Falha ao exportar payload do app_state (COPY).' }
    docker cp "${name}:$remote" $local 1>$null
    if (-not (Test-Path $local)) { throw 'Arquivo de payload nao foi gerado.' }
    $raw = [IO.File]::ReadAllText($local, $utf8).Trim()
    if (-not $raw) { throw 'app_state esta vazio - nao ha dados para exportar.' }
    return ($raw | ConvertFrom-Json)
  } finally {
    docker exec $name rm -f $remote $remoteSql 1>$null 2>$null
    Remove-Item $local, $tmpSql -Force -ErrorAction SilentlyContinue
  }
}

function ConvertTo-FlatRows($Items, [string[]]$Columns) {
  $rows = New-Object System.Collections.Generic.List[object]
  foreach ($item in @($Items)) {
    if ($null -eq $item) { continue }
    $row = [ordered]@{}
    foreach ($col in $Columns) {
      $val = $null
      try { $val = $item.$col } catch { $val = $null }
      if ($null -eq $val) {
        $row[$col] = ''
      } elseif ($val -is [bool]) {
        $row[$col] = if ($val) { 'SIM' } else { 'NAO' }
      } elseif ($val -is [string]) {
        $row[$col] = $val
      } elseif ($val -is [System.Collections.IDictionary] -or $val -is [psobject]) {
        try { $row[$col] = ($val | ConvertTo-Json -Compress -Depth 6) } catch { $row[$col] = [string]$val }
      } elseif ($val -is [System.Collections.IEnumerable]) {
        try { $row[$col] = ($val | ConvertTo-Json -Compress -Depth 6) } catch { $row[$col] = [string]$val }
      } else {
        $row[$col] = [string]$val
      }
    }
    $rows.Add([pscustomobject]$row) | Out-Null
  }
  return $rows
}

function Set-ExcelHeaderStyle($Worksheet, [int]$ColCount, [int]$HeaderColorRgb) {
  if ($ColCount -lt 1) { return }
  $header = $Worksheet.Range($Worksheet.Cells.Item(1, 1), $Worksheet.Cells.Item(1, $ColCount))
  $header.Interior.Pattern = 1 # xlSolid
  $header.Interior.Color = $HeaderColorRgb
  $header.Font.Bold = $true
  $header.Font.Color = 0xFFFFFF
  $header.Font.Name = 'Calibri'
  $header.Font.Size = 11
  $header.HorizontalAlignment = -4108 # center
  $header.VerticalAlignment = -4108
  try { $header.Rows.RowHeight = 22 } catch { }
}

function Write-ExcelSheet {
  param(
    $Workbook,
    [string]$SheetName,
    $Rows,
    [int]$TabColorRgb,
    [int]$HeaderColorRgb
  )

  $safeName = ($SheetName -replace '[\\\/\?\*\[\]]', ' ').Trim()
  if ($safeName.Length -gt 31) { $safeName = $safeName.Substring(0, 31) }

  $ws = $null
  foreach ($s in @($Workbook.Worksheets)) {
    if ($s.Name -eq $safeName) { $ws = $s; break }
  }
  if (-not $ws) {
    $ws = $Workbook.Worksheets.Add()
    $ws.Name = $safeName
  }

  try { $ws.Tab.Color = $TabColorRgb } catch { }

  $list = @($Rows)
  if ($list.Count -eq 0) {
    $ws.Cells.Item(1, 1) = '(sem registros)'
    Set-ExcelHeaderStyle $ws 1 $HeaderColorRgb
    return $ws
  }

  $props = @($list[0].PSObject.Properties.Name)
  for ($c = 0; $c -lt $props.Count; $c++) {
    $ws.Cells.Item(1, $c + 1) = [string]$props[$c]
  }
  for ($r = 0; $r -lt $list.Count; $r++) {
    for ($c = 0; $c -lt $props.Count; $c++) {
      $v = $list[$r].($props[$c])
      if ($null -eq $v) { $v = '' }
      $ws.Cells.Item($r + 2, $c + 1) = [string]$v
    }
  }

  $rowCount = $list.Count + 1
  $colCount = $props.Count
  $used = $ws.Range($ws.Cells.Item(1, 1), $ws.Cells.Item($rowCount, $colCount))

  Set-ExcelHeaderStyle $ws $colCount $HeaderColorRgb

  $used.Borders.LineStyle = 1
  $used.Borders.Color = 0xB0B0B0
  $used.Font.Name = 'Calibri'
  $used.Font.Size = 10
  $used.Rows.RowHeight = 18

  # Linhas zebradas leves (exceto cabecalho)
  if ($rowCount -gt 1) {
    for ($r = 2; $r -le $rowCount; $r++) {
      if (($r % 2) -eq 0) {
        $ws.Range($ws.Cells.Item($r, 1), $ws.Cells.Item($r, $colCount)).Interior.Color = 0xF3F7F5
      }
    }
  }

  try {
    $ws.ListObjects.Add(1, $used, $null, 1) | Out-Null # xlSrcRange, xlYes
  } catch {
    try { $used.AutoFilter() | Out-Null } catch { }
  }

  try {
    $ws.Activate() | Out-Null
    $win = $ws.Application.ActiveWindow
    if ($win) {
      $win.SplitColumn = 0
      $win.SplitRow = 1
      $win.FreezePanes = $true
    }
  } catch { }
  try { $used.Columns.AutoFit() | Out-Null } catch { }

  # Evita colunas gigantes
  for ($c = 1; $c -le $colCount; $c++) {
    if ($ws.Columns.Item($c).ColumnWidth -gt 48) {
      $ws.Columns.Item($c).ColumnWidth = 48
    }
  }

  return $ws
}

# --- cores (Excel usa BGR) ---
$hdrGreen = 0x718B55   # #558B71
$hdrTeal  = 0x8A7A3A
$hdrBlue  = 0x8B5E3A
$hdrSlate = 0x6B5E4F
$tabGreen = 0x558B71
$tabTeal  = 0x3A7A8A
$tabBlue  = 0x3A5E8B
$tabSlate = 0x4F5E6B
$tabAmber = 0x3A7AA8

Write-Host '==> Lendo dados do sistema (app_state)...'
$data = Get-AppStatePayloadObject
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$acompRoot = Get-AcompSolempRoot
$dadosDir = Join-Path $acompRoot 'Dados'
New-Item -ItemType Directory -Force -Path $dadosDir | Out-Null

$xlsxPath = Join-Path $dadosDir ("AcompOPMS-Dados-{0}.xlsx" -f $stamp)
$xlsxAtual = Join-Path $dadosDir 'AcompOPMS-Dados-atual.xlsx'
$jsonPath = Join-Path $dadosDir ("AcompOPMS-Snapshot-{0}.json" -f $stamp)
$jsonAtual = Join-Path $dadosDir 'AcompOPMS-Snapshot-atual.json'

Write-Host '==> Gravando snapshot JSON (para recarga)...'
$snapshot = [ordered]@{
  exportedAt = (Get-Date).ToString('o')
  product    = 'AcompOPMS'
  format     = 'app_state.payload'
  data       = $data
}
($snapshot | ConvertTo-Json -Depth 40) | Set-Content -Path $jsonPath -Encoding UTF8
Copy-Item $jsonPath $jsonAtual -Force

Write-Host '==> Montando Excel organizado...'
$excel = $null
$wb = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $false
  $wb = $excel.Workbooks.Add()

  # Remove folhas extras padrao depois de criar as nossas
  $sheetsToBuild = @(
    @{
      Name = '01_Resumo'
      Tab = $tabGreen; Hdr = $hdrGreen
      Rows = @(
        [pscustomobject]@{ Campo = 'Exportado em'; Valor = (Get-Date -Format 'dd/MM/yyyy HH:mm:ss') }
        [pscustomobject]@{ Campo = 'Organizacao (org)'; Valor = [string]$data.tenantMeta.orgCode }
        [pscustomobject]@{ Campo = 'Gestor (e-mail)'; Valor = [string]$data.tenantMeta.ownerEmail }
        [pscustomobject]@{ Campo = 'Usuarios'; Valor = @($data.usuarios).Count }
        [pscustomobject]@{ Campo = 'Clinicas'; Valor = @($data.clinicas).Count }
        [pscustomobject]@{ Campo = 'Empresas'; Valor = @($data.empresas).Count }
        [pscustomobject]@{ Campo = 'Materiais'; Valor = @($data.materiais).Count }
        [pscustomobject]@{ Campo = 'Pedidos'; Valor = @($data.pedidos).Count }
        [pscustomobject]@{ Campo = 'SOLEMP'; Valor = @($data.solemp).Count }
        [pscustomobject]@{ Campo = 'Notas fiscais'; Valor = @($data.notasFiscais).Count }
        [pscustomobject]@{ Campo = 'Historico'; Valor = @($data.historico).Count }
        [pscustomobject]@{ Campo = 'Arquivos (meta)'; Valor = @($data.arquivos).Count }
        [pscustomobject]@{ Campo = 'Notificacoes'; Valor = @($data.notificacoes).Count }
        [pscustomobject]@{ Campo = 'Reversoes'; Valor = @($data.reversoes).Count }
        [pscustomobject]@{ Campo = 'Arquivados'; Valor = @($data.processosArquivados).Count }
        [pscustomobject]@{ Campo = 'Chat'; Valor = @($data.chatMensagens).Count }
        [pscustomobject]@{ Campo = 'Arquivo Excel'; Valor = [IO.Path]::GetFileName($xlsxPath) }
        [pscustomobject]@{ Campo = 'Snapshot JSON'; Valor = [IO.Path]::GetFileName($jsonPath) }
      )
    }
    @{
      Name = '02_Usuarios'; Tab = $tabGreen; Hdr = $hdrGreen
      Rows = ConvertTo-FlatRows $data.usuarios @('id','nome','posto','graduacao','login','email','perfil','clinicaId','ativo')
    }
    @{
      Name = '03_Clinicas'; Tab = $tabTeal; Hdr = $hdrTeal
      Rows = ConvertTo-FlatRows $data.clinicas @('id','nome','responsavel','telefone','tipo')
    }
    @{
      Name = '04_Empresas'; Tab = $tabTeal; Hdr = $hdrTeal
      Rows = ConvertTo-FlatRows $data.empresas @('id','razaoSocial','nomeFantasia','cnpj','contato','telefone','email')
    }
    @{
      Name = '05_Materiais'; Tab = $tabTeal; Hdr = $hdrTeal
      Rows = ConvertTo-FlatRows $data.materiais @('id','descricao','fabricante','unidade')
    }
    @{
      Name = '06_Workflow'; Tab = $tabBlue; Hdr = $hdrBlue
      Rows = ConvertTo-FlatRows $data.workflowEtapas @('id','nome','ordem','prazoDias','alertaVencimentoDias','perfilResponsavel','chave')
    }
    @{
      Name = '07_Pedidos'; Tab = $tabGreen; Hdr = $hdrGreen
      Rows = ConvertTo-FlatRows $data.pedidos @(
        'id','numero','clinicaId','empresaId','materialId','quantidade','valor','observacoes',
        'dataSolicitacao','dataEntrega','etapaAtualId','etapasAtivasIds','responsavelAtualId','concluido',
        'empenhoNumero','aguardandoEmpenho','aguardandoEmpenhoEm','paciente','dadosClinica'
      )
    }
    @{
      Name = '08_Solemp'; Tab = $tabAmber; Hdr = $hdrBlue
      Rows = ConvertTo-FlatRows $data.solemp @('id','pedidoId','numero','status','dataCriacao','valor','observacoes')
    }
    @{
      Name = '09_NotasFiscais'; Tab = $tabAmber; Hdr = $hdrBlue
      Rows = ConvertTo-FlatRows $data.notasFiscais @('id','pedidoId','numero','serie','dataEmissao','valor','arquivoId')
    }
    @{
      Name = '10_Historico'; Tab = $tabSlate; Hdr = $hdrSlate
      Rows = ConvertTo-FlatRows $data.historico @('id','pedidoId','tipo','descricao','usuarioId','usuarioNome','data','etapaId')
    }
    @{
      Name = '11_Arquivos'; Tab = $tabSlate; Hdr = $hdrSlate
      Rows = ConvertTo-FlatRows $data.arquivos @('id','nome','tipo','tamanho','pedidoId','dataUpload','usuarioId','storagePath')
    }
    @{
      Name = '12_Notificacoes'; Tab = $tabSlate; Hdr = $hdrSlate
      Rows = ConvertTo-FlatRows $data.notificacoes @('id','tipo','titulo','mensagem','pedidoId','reversaoId','perfilDestino','etapaChave','lida','data')
    }
    @{
      Name = '13_Reversoes'; Tab = $tabBlue; Hdr = $hdrBlue
      Rows = ConvertTo-FlatRows $data.reversoes @(
        'id','pedidoId','pedidoNumero','clinicaNome','etapaDeNome','etapaParaNome','motivo',
        'usuarioId','usuarioNome','data','status','respostaGestor','dataResposta','gestorNome'
      )
    }
    @{
      Name = '14_Arquivados'; Tab = $tabSlate; Hdr = $hdrSlate
      Rows = ConvertTo-FlatRows $data.processosArquivados @('id','pedidoId','numero','motivo','dataArquivamento','usuarioId','usuarioNome','snapshot')
    }
    @{
      Name = '15_Chat'; Tab = $tabTeal; Hdr = $hdrTeal
      Rows = ConvertTo-FlatRows $data.chatMensagens @('id','threadId','autorId','autorNome','autorPerfil','texto','data','lidasPor','editadoEm')
    }
    @{
      Name = '16_Medicamentos'; Tab = $tabAmber; Hdr = $hdrBlue
      Rows = ConvertTo-FlatRows $data.medicamentosPrecos @('id','nome','apresentacao','preco','atualizadoEm','observacao')
    }
  )

  foreach ($spec in $sheetsToBuild) {
    Write-Host ("  - aba {0}" -f $spec.Name)
    [void](Write-ExcelSheet -Workbook $wb -SheetName $spec.Name -Rows $spec.Rows -TabColorRgb $spec.Tab -HeaderColorRgb $spec.Hdr)
  }

  # Remove folhas Padrao (Planilha1 etc.) que sobraram sem nosso prefixo
  foreach ($s in @($wb.Worksheets)) {
    $n = [string]$s.Name
    if ($n -notmatch '^\d{2}_') {
      try { $s.Delete() } catch { }
    }
  }

  # Garante Resumo como primeira aba
  try {
    $resumo = $wb.Worksheets.Item('01_Resumo')
    $resumo.Move($wb.Worksheets.Item(1))
  } catch { }

  if (Test-Path $xlsxPath) { Remove-Item $xlsxPath -Force }
  $wb.SaveAs($xlsxPath, 51) # xlOpenXMLWorkbook
  $wb.Close($false)
  Copy-Item $xlsxPath $xlsxAtual -Force
} finally {
  if ($excel) {
    try { $excel.Quit() } catch { }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [gc]::Collect()
  [gc]::WaitForPendingFinalizers()
}

# LEIA-ME na pasta Dados
$readme = @"
AcompOPMS — pasta Dados
=======================
Arquivos gerados por Exportar-Dados-Excel.ps1:

- AcompOPMS-Dados-atual.xlsx     → Excel multi-abas (abrir no Excel)
- AcompOPMS-Snapshot-atual.json  → Copia completa do app_state (para recarga)
- AcompOPMS-Dados-AAAA...xlsx    → Historico datado
- AcompOPMS-Snapshot-AAAA...json → Historico datado

Recarga: use Restaurar-Dados-Snapshot.ps1 apontando para um JSON desta pasta.
"@
Set-Content -Path (Join-Path $dadosDir 'LEIA-ME-Dados.txt') -Value $readme -Encoding UTF8

Write-Host ''
Write-Host 'Exportacao concluida:'
Write-Host "  Excel:    $xlsxAtual"
Write-Host "  Snapshot: $jsonAtual"
Write-Host "  Pasta:    $dadosDir"
