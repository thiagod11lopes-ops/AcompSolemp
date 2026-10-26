# Exporta os dados do AcompOPMS em UM unico CSV na pasta AcompSolemp\Dados.
# Nome: DadosOMPS (dd-MM-yyyy HH-mm-ss).csv
# Remove CSV anteriores DadosOMPS*.csv para manter apenas o arquivo atual.
#
# Uso: .\Exportar-Dados-Csv.ps1

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

function Get-AcompSolempRoot {
  $root = Get-ServidorRoot
  $parent = Split-Path $root -Parent
  if (Test-Path (Join-Path $parent 'frontend')) { return $parent }
  return $parent
}

function Get-AppStatePayloadObject {
  $name = 'supabase-db'
  docker inspect $name 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Container supabase-db nao esta em execucao.' }

  $id = [guid]::NewGuid().ToString('N')
  $remote = "/tmp/acomp-csv-payload-$id.json"
  $remoteSql = "/tmp/acomp-csv-payload-$id.sql"
  $local = Join-Path $env:TEMP "acomp-csv-payload-$id.json"
  $tmpSql = Join-Path $env:TEMP "acomp-csv-payload-$id.sql"
  $utf8 = New-Object System.Text.UTF8Encoding $false
  try {
    $copySql = "\copy (SELECT payload::text FROM public.app_state ORDER BY updated_at DESC NULLS LAST LIMIT 1) TO '$remote'`n"
    [IO.File]::WriteAllText($tmpSql, $copySql, $utf8)
    docker cp $tmpSql "${name}:$remoteSql" 1>$null
    $p = Start-Process -FilePath 'docker' -ArgumentList @(
      'exec', '-e', 'PGCLIENTENCODING=UTF8', $name,
      'psql', '-U', 'postgres', '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1', '-f', $remoteSql
    ) -Wait -PassThru -NoNewWindow
    if ($p.ExitCode -ne 0) { throw 'Falha ao ler app_state.' }
    docker cp "${name}:$remote" $local 1>$null
    $raw = [IO.File]::ReadAllText($local, $utf8).Trim()
    if (-not $raw) { throw 'app_state vazio.' }
    return ($raw | ConvertFrom-Json)
  } finally {
    docker exec $name rm -f $remote $remoteSql 1>$null 2>$null
    Remove-Item $local, $tmpSql -Force -ErrorAction SilentlyContinue
  }
}

function ConvertTo-CsvCell($Value) {
  if ($null -eq $Value) { return '' }
  if ($Value -is [bool]) { return $(if ($Value) { 'SIM' } else { 'NAO' }) }
  if ($Value -is [string]) { return $Value }
  if ($Value -is [datetime]) { return $Value.ToString('dd/MM/yyyy HH:mm:ss') }
  if ($Value -is [System.Collections.IDictionary] -or $Value -is [psobject]) {
    try { return (($Value | ConvertTo-Json -Compress -Depth 5) -replace '"', "'") } catch { return [string]$Value }
  }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    try { return (($Value | ConvertTo-Json -Compress -Depth 5) -replace '"', "'") } catch { return [string]$Value }
  }
  return [string]$Value
}

function Add-CsvSection {
  param(
    [System.Collections.Generic.List[string]]$Lines,
    [string]$Secao,
    $Items,
    [string[]]$Columns
  )
  foreach ($item in @($Items)) {
    if ($null -eq $item) { continue }
    $cells = New-Object System.Collections.Generic.List[string]
    $cells.Add((ConvertTo-CsvCell $Secao)) | Out-Null
    foreach ($col in $Columns) {
      $val = $null
      try { $val = $item.$col } catch { }
      $cells.Add((ConvertTo-CsvCell $val)) | Out-Null
    }
    # Escapar campos com ; ou aspas
    $escaped = foreach ($c in $cells) {
      $t = [string]$c
      if ($t -match '[;"\r\n]') {
        '"' + ($t -replace '"', '""') + '"'
      } else { $t }
    }
    $Lines.Add(($escaped -join ';')) | Out-Null
  }
}

$lockPath = Join-Path (Get-ServidorRoot) 'state\export-dados.lock'
$lockDir = Split-Path $lockPath -Parent
if (-not (Test-Path $lockDir)) { New-Item -ItemType Directory -Force -Path $lockDir | Out-Null }
if (Test-Path $lockPath) {
  $age = (Get-Date) - (Get-Item $lockPath).LastWriteTime
  if ($age.TotalMinutes -lt 2) {
    Write-Host 'Exportacao ja em andamento — ignorado.'
    exit 0
  }
}
Set-Content -Path $lockPath -Value (Get-Date).ToString('o') -Encoding ASCII

try {
  Write-Host '==> Lendo dados do sistema...'
  $data = Get-AppStatePayloadObject

  $acompRoot = Get-AcompSolempRoot
  $dadosDir = Join-Path $acompRoot 'Dados'
  New-Item -ItemType Directory -Force -Path $dadosDir | Out-Null

  $stamp = Get-Date -Format 'dd-MM-yyyy HH-mm-ss'
  $fileName = "DadosOMPS ($stamp).csv"
  $csvPath = Join-Path $dadosDir $fileName

  # Remove exports antigos (mantem apenas o CSV novo = arquivo unico atualizado)
  Get-ChildItem -LiteralPath $dadosDir -File -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -like 'DadosOMPS (*).csv' -or
      $_.Name -like 'AcompOPMS-Dados*.xlsx' -or
      $_.Name -like 'AcompOPMS-Snapshot*.json'
    } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  $headerCols = @(
    'Secao',
    'id', 'numero', 'nome', 'email', 'perfil', 'clinicaId', 'empresaId', 'materialId',
    'quantidade', 'valor', 'status', 'data', 'dataSolicitacao', 'dataEntrega',
    'etapaAtualId', 'concluido', 'observacoes', 'telefone', 'tipo', 'descricao',
    'cnpj', 'razaoSocial', 'titulo', 'mensagem', 'usuarioNome', 'ativo', 'extra'
  )
  $cols = @(
    'id','numero','nome','email','perfil','clinicaId','empresaId','materialId',
    'quantidade','valor','status','data','dataSolicitacao','dataEntrega',
    'etapaAtualId','concluido','observacoes','telefone','tipo','descricao',
    'cnpj','razaoSocial','titulo','mensagem','usuarioNome','ativo','extra'
  )

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add(($headerCols -join ';')) | Out-Null

  function Emit([string]$Secao, $Objs) {
    Add-CsvSection $lines $Secao $Objs $cols
  }

  Emit 'Resumo' @(
    [pscustomobject]@{
      id = 'export'
      nome = 'AcompOPMS'
      data = (Get-Date).ToString('dd/MM/yyyy HH:mm:ss')
      email = [string]$data.tenantMeta.ownerEmail
      observacoes = ("org={0}; usuarios={1}; clinicas={2}; empresas={3}; materiais={4}; pedidos={5}; solemp={6}; nfs={7}; historico={8}" -f `
        [string]$data.tenantMeta.orgCode,
        @($data.usuarios).Count, @($data.clinicas).Count, @($data.empresas).Count,
        @($data.materiais).Count, @($data.pedidos).Count, @($data.solemp).Count,
        @($data.notasFiscais).Count, @($data.historico).Count)
    }
  )

  Emit 'Usuarios' (@($data.usuarios) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; nome = $_.nome; email = $_.email; perfil = $_.perfil
      clinicaId = $_.clinicaId; ativo = $_.ativo
      observacoes = ("posto={0}; graduacao={1}; login={2}" -f $_.posto, $_.graduacao, $_.login)
    }
  })

  Emit 'Clinicas' (@($data.clinicas) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; nome = $_.nome; telefone = $_.telefone; tipo = $_.tipo
      observacoes = ("responsavel={0}" -f $_.responsavel)
    }
  })

  Emit 'Empresas' (@($data.empresas) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; nome = $_.nomeFantasia; razaoSocial = $_.razaoSocial; cnpj = $_.cnpj
      email = $_.email; telefone = $_.telefone
      observacoes = ("contato={0}" -f $_.contato)
    }
  })

  Emit 'Materiais' (@($data.materiais) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; descricao = $_.descricao; nome = $_.fabricante
      observacoes = ("unidade={0}" -f $_.unidade)
    }
  })

  Emit 'Workflow' (@($data.workflowEtapas) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; nome = $_.nome; numero = [string]$_.ordem
      perfil = $_.perfilResponsavel
      observacoes = ("prazoDias={0}; chave={1}" -f $_.prazoDias, $_.chave)
    }
  })

  Emit 'Pedidos' (@($data.pedidos) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; numero = $_.numero; clinicaId = $_.clinicaId; empresaId = $_.empresaId
      materialId = $_.materialId; quantidade = $_.quantidade; valor = $_.valor
      dataSolicitacao = $_.dataSolicitacao; dataEntrega = $_.dataEntrega
      etapaAtualId = $_.etapaAtualId; concluido = $_.concluido; observacoes = $_.observacoes
      extra = ("empenho={0}" -f $_.empenhoNumero)
    }
  })

  Emit 'Solemp' (@($data.solemp) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; numero = $_.numero; status = $_.status; valor = $_.valor
      data = $_.dataCriacao; observacoes = $_.observacoes
      extra = ("pedidoId={0}" -f $_.pedidoId)
    }
  })

  Emit 'NotasFiscais' (@($data.notasFiscais) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; numero = $_.numero; valor = $_.valor; data = $_.dataEmissao
      extra = ("pedidoId={0}; serie={1}" -f $_.pedidoId, $_.serie)
    }
  })

  Emit 'Historico' (@($data.historico) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; data = $_.data; usuarioNome = $_.usuarioNome
      observacoes = $_.observacao
      extra = ("pedidoId={0}; etapa={1}" -f $_.pedidoId, $_.etapaNome)
    }
  })

  Emit 'Arquivos' (@($data.arquivos) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; nome = $_.nome; tipo = $_.tipo; data = $_.dataUpload
      extra = ("pedidoId={0}; tamanho={1}" -f $_.pedidoId, $_.tamanho)
    }
  })

  Emit 'Notificacoes' (@($data.notificacoes) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; tipo = $_.tipo; titulo = $_.titulo; mensagem = $_.mensagem
      data = $_.data; perfil = $_.perfilDestino
      extra = ("lida={0}; pedidoId={1}" -f $_.lida, $_.pedidoId)
    }
  })

  Emit 'Reversoes' (@($data.reversoes) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; numero = $_.pedidoNumero; nome = $_.clinicaNome; status = $_.status
      data = $_.data; usuarioNome = $_.usuarioNome; observacoes = $_.motivo
      extra = ("de={0}; para={1}" -f $_.etapaDeNome, $_.etapaParaNome)
    }
  })

  Emit 'Arquivados' (@($data.processosArquivados) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; numero = $_.numero; data = $_.dataArquivamento
      usuarioNome = $_.usuarioNome; observacoes = $_.motivo
      extra = ("pedidoId={0}" -f $_.pedidoId)
    }
  })

  Emit 'Chat' (@($data.chatMensagens) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id; nome = $_.autorNome; perfil = $_.autorPerfil
      mensagem = $_.texto; data = $_.data
      extra = ("thread={0}" -f $_.threadId)
    }
  })

  $utf8Bom = New-Object System.Text.UTF8Encoding $true
  [IO.File]::WriteAllLines($csvPath, $lines.ToArray(), $utf8Bom)

  $readme = @"
AcompOPMS — pasta Dados
=======================
Arquivo atual (unico CSV, sempre renovado ao criar documento na Timeline):

  DadosOMPS (dd-MM-yyyy HH-mm-ss).csv

Abra no Excel (separador ;). A coluna Secao identifica o tipo de registro.
"@
  Set-Content -Path (Join-Path $dadosDir 'LEIA-ME-Dados.txt') -Value $readme -Encoding UTF8

  Write-Host "CSV gerado: $csvPath"
} finally {
  Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}
