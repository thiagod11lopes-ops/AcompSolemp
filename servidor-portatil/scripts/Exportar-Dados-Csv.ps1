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

function Get-DadosOutputDirs {
  $set = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
  [void]$set.Add((Join-Path (Get-AcompSolempRoot) 'Dados'))
  $desk = [Environment]::GetFolderPath('Desktop')
  foreach ($rel in @(
      'Iniciar Servidor\AcompSolemp',
      'Thiago\Projetos\AcompSolemp'
    )) {
    $candidate = Join-Path $desk $rel
    if (Test-Path (Join-Path $candidate 'frontend')) {
      [void]$set.Add((Join-Path $candidate 'Dados'))
    }
  }
  return @($set)
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
    # Blob app_state vem "stripped" (Fase 9); hidrata arrays das tabelas normalizadas.
    # 1) monta linha em tabela temp  2) \copy (aceita SELECT simples)
    $copySql = @"
CREATE TEMP TABLE acomp_csv_hydrated AS
WITH base AS (
  SELECT tenant_id, payload
  FROM public.app_state
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1
),
agg AS (
  SELECT
    b.payload
      || jsonb_build_object(
        'usuarios', COALESCE((SELECT jsonb_agg(u.data ORDER BY u.updated_at) FROM public.usuarios u WHERE u.tenant_id = b.tenant_id), '[]'::jsonb),
        'clinicas', COALESCE((SELECT jsonb_agg(c.data ORDER BY c.updated_at) FROM public.clinicas c WHERE c.tenant_id = b.tenant_id), '[]'::jsonb),
        'empresas', COALESCE((SELECT jsonb_agg(e.data ORDER BY e.updated_at) FROM public.empresas e WHERE e.tenant_id = b.tenant_id), '[]'::jsonb),
        'materiais', COALESCE((SELECT jsonb_agg(m.data ORDER BY m.updated_at) FROM public.materiais m WHERE m.tenant_id = b.tenant_id), '[]'::jsonb),
        'pedidos', COALESCE((SELECT jsonb_agg(p.data ORDER BY p.updated_at) FROM public.pedidos p WHERE p.tenant_id = b.tenant_id), '[]'::jsonb),
        'historico', COALESCE((SELECT jsonb_agg(h.data ORDER BY h.updated_at) FROM public.pedido_historico h WHERE h.tenant_id = b.tenant_id), '[]'::jsonb),
        'workflowEtapas', COALESCE((SELECT jsonb_agg(w.data ORDER BY w.updated_at) FROM public.workflow_etapas w WHERE w.tenant_id = b.tenant_id), '[]'::jsonb),
        'arquivos', COALESCE((SELECT jsonb_agg(a.data ORDER BY a.updated_at) FROM public.anexos a WHERE a.tenant_id = b.tenant_id), '[]'::jsonb),
        'chatMensagens', COALESCE((SELECT jsonb_agg(ch.data ORDER BY ch.updated_at) FROM public.chat_mensagens ch WHERE ch.tenant_id = b.tenant_id), '[]'::jsonb),
        'reversoes', COALESCE((SELECT jsonb_agg(r.data ORDER BY r.updated_at) FROM public.reversoes r WHERE r.tenant_id = b.tenant_id), '[]'::jsonb),
        'notificacoes', COALESCE((SELECT jsonb_agg(n.data ORDER BY n.updated_at) FROM public.notificacoes n WHERE n.tenant_id = b.tenant_id), '[]'::jsonb),
        'processosArquivados', COALESCE((SELECT jsonb_agg(pa.data ORDER BY pa.updated_at) FROM public.processos_arquivados pa WHERE pa.tenant_id = b.tenant_id), '[]'::jsonb),
        'solemp', COALESCE((SELECT jsonb_agg(s.data ORDER BY s.updated_at) FROM public.solemp s WHERE s.tenant_id = b.tenant_id), '[]'::jsonb),
        'notasFiscais', COALESCE((SELECT jsonb_agg(nf.data ORDER BY nf.updated_at) FROM public.notas_fiscais nf WHERE nf.tenant_id = b.tenant_id), '[]'::jsonb),
        'pedidoPlanilhaEnvio', COALESCE((
          SELECT jsonb_object_agg(ppe.pedido_id, ppe.data)
          FROM public.pedido_planilha_envio ppe
          WHERE ppe.tenant_id = b.tenant_id
        ), '{}'::jsonb)
      ) AS hydrated
  FROM base b
)
SELECT hydrated::text AS body FROM agg;
\copy (SELECT body FROM acomp_csv_hydrated) TO '$remote'
"@
    [IO.File]::WriteAllText($tmpSql, $copySql, $utf8)
    docker cp $tmpSql "${name}:$remoteSql" 1>$null
    $p = Start-Process -FilePath 'docker' -ArgumentList @(
      'exec', '-e', 'PGCLIENTENCODING=UTF8', $name,
      'psql', '-U', 'postgres', '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1', '-f', $remoteSql
    ) -Wait -PassThru -NoNewWindow
    if ($p.ExitCode -ne 0) { throw 'Falha ao ler app_state hidratado.' }
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
    Write-Host 'Exportacao ja em andamento - ignorado.'
    exit 0
  }
}
Set-Content -Path $lockPath -Value (Get-Date).ToString('o') -Encoding ASCII

try {
  Write-Host '==> Lendo dados do sistema...'
  $data = Get-AppStatePayloadObject

  $dadosDirs = @(Get-DadosOutputDirs)
  foreach ($dadosDir in $dadosDirs) {
    New-Item -ItemType Directory -Force -Path $dadosDir | Out-Null
  }

  $stamp = Get-Date -Format 'dd-MM-yyyy HH-mm-ss'
  $fileName = "DadosOMPS ($stamp).csv"

  # Remove exports antigos em todas as pastas Dados (arquivo unico atualizado)
  foreach ($dadosDir in $dadosDirs) {
    Get-ChildItem -LiteralPath $dadosDir -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -like 'DadosOMPS (*).csv' -or
        $_.Name -like 'AcompOPMS-Dados*.xlsx' -or
        $_.Name -like 'AcompOPMS-Snapshot*.json'
      } |
      Remove-Item -Force -ErrorAction SilentlyContinue
  }

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

  # --- Planilhas (rascunho Enviar + snapshots enviados) ---
  $planilhaRows = @()
  $plMap = $data.planilhasLivres
  if ($null -ne $plMap) {
    foreach ($clinicaProp in @($plMap.PSObject.Properties)) {
      if ($clinicaProp.MemberType -ne 'NoteProperty') { continue }
      $clinicaId = [string]$clinicaProp.Name
      $st = $clinicaProp.Value
      if ($null -eq $st) { continue }
      $conmed = $st.conmedComrj
      if ($null -ne $conmed) {
        $planilhaRows += [pscustomobject]@{
          id = "conmed-$clinicaId"
          clinicaId = $clinicaId
          tipo = 'CONMED_CABECALHO'
          numero = [string]$conmed.numero
          data = [string]$conmed.data
          nome = [string]$conmed.fornecedor
          observacoes = ("processo={0}; pregao={1}; vigencia={2}" -f $conmed.processo, $conmed.pregaoTad, $conmed.vigencia)
          extra = 'planilhasLivres'
        }
        foreach ($pac in @($conmed.pacientes)) {
          if ($null -eq $pac) { continue }
          foreach ($mat in @($pac.materiais)) {
            if ($null -eq $mat) { continue }
            $planilhaRows += [pscustomobject]@{
              id = [string]$mat.id
              clinicaId = $clinicaId
              tipo = 'CONMED_MATERIAL'
              numero = [string]$pac.nip
              nome = [string]$pac.iniciais
              data = [string]$pac.data
              descricao = [string]$mat.descricao
              quantidade = [string]$mat.qt
              valor = [string]$mat.valorTotal
              observacoes = [string]$pac.procedimento
              extra = ("mapa={0}; danfe={1}; item={2}; nebPi={3}; unit={4}; valorPac={5}" -f `
                $mat.mapaDaSala, $mat.danfe, $mat.item, $mat.nebPi, $mat.valorUnit, $pac.valorPorPaciente)
            }
          }
        }
      }
      $imhLinhas = @()
      if ($st.imh -and $st.imh.linhas) { $imhLinhas = @($st.imh.linhas) }
      foreach ($linha in $imhLinhas) {
        if ($null -eq $linha) { continue }
        $planilhaRows += [pscustomobject]@{
          id = [string]$linha.id
          clinicaId = $clinicaId
          tipo = 'IMH'
          numero = [string]$linha.nip
          nome = [string]$linha.nomeUsuario
          data = [string]$linha.data
          descricao = [string]$linha.descricao
          quantidade = [string]$linha.quantidade
          valor = [string]$linha.valorTotal
          observacoes = ("vinculo={0}; unit={1}; pct={2}" -f $linha.vinculo, $linha.valorUnit, $linha.pctIndenizar)
          extra = 'planilhasLivres.imh'
        }
      }
      $imhMedLinhas = @()
      if ($st.imhMedicamento -and $st.imhMedicamento.linhas) { $imhMedLinhas = @($st.imhMedicamento.linhas) }
      foreach ($linha in $imhMedLinhas) {
        if ($null -eq $linha) { continue }
        $planilhaRows += [pscustomobject]@{
          id = [string]$linha.id
          clinicaId = $clinicaId
          tipo = 'IMH_MEDICAMENTO'
          numero = [string]$linha.nip
          nome = [string]$linha.nome
          data = [string]$linha.data
          descricao = [string]$linha.itemPme
          quantidade = [string]$linha.qtd
          valor = [string]$linha.total
          observacoes = ("lote={0}; validade={1}; pct={2}" -f $linha.lote, $linha.validade, $linha.pctIndenizar)
          extra = 'planilhasLivres.imhMedicamento'
        }
      }
      foreach ($row in @($st.consumoMaterialConsignado)) {
        if ($null -eq $row) { continue }
        $planilhaRows += [pscustomobject]@{
          id = [string]$row.id
          clinicaId = $clinicaId
          tipo = 'CONSUMO_MATERIAL'
          numero = [string]$row.nip
          nome = [string]$row.paciente
          data = [string]$row.data
          descricao = [string]$row.descricao
          quantidade = [string]$row.quantidade
          valor = [string]$row.valorTotal
          observacoes = [string]$row.empresa
          extra = 'planilhasLivres.consumo'
        }
      }
    }
  }

  $envioMap = $data.pedidoPlanilhaEnvio
  if ($null -ne $envioMap) {
    foreach ($pedProp in @($envioMap.PSObject.Properties)) {
      if ($pedProp.MemberType -ne 'NoteProperty') { continue }
      $pedidoId = [string]$pedProp.Name
      $snap = $pedProp.Value
      if ($null -eq $snap) { continue }
      $formato = [string]$snap.formato
      if (-not $formato) { $formato = 'imh' }
      $linhasEnvio = @()
      if ($snap.imhAbaLinhas) { $linhasEnvio = @($snap.imhAbaLinhas) }
      elseif ($snap.linhas) { $linhasEnvio = @($snap.linhas) }
      elseif ($snap.controleSolempLinhas) { $linhasEnvio = @($snap.controleSolempLinhas) }
      elseif ($snap.imhMedicamentoLinhas) { $linhasEnvio = @($snap.imhMedicamentoLinhas) }
      $idx = 0
      $clinicaEnvio = ''
      if ($snap.cabecalho) { $clinicaEnvio = [string]$snap.cabecalho.clinica }
      foreach ($linha in $linhasEnvio) {
        if ($null -eq $linha) { continue }
        $idx++
        $nomeLinha = [string]$linha.nomeUsuario
        if (-not $nomeLinha) { $nomeLinha = [string]$linha.nome }
        if (-not $nomeLinha) { $nomeLinha = [string]$linha.paciente }
        $descLinha = [string]$linha.descricao
        if (-not $descLinha) { $descLinha = [string]$linha.material }
        $valorLinha = [string]$linha.valorTotal
        if (-not $valorLinha) { $valorLinha = [string]$linha.valor }
        $idLinha = [string]$linha.id
        if (-not $idLinha) { $idLinha = "$pedidoId-$idx" }
        $planilhaRows += [pscustomobject]@{
          id = $idLinha
          clinicaId = $clinicaEnvio
          tipo = ("ENVIO_{0}" -f $formato.ToUpper())
          numero = [string]$linha.nip
          nome = $nomeLinha
          data = [string]$linha.data
          descricao = $descLinha
          quantidade = [string]$linha.quantidade
          valor = $valorLinha
          observacoes = [string]$linha.procedimento
          extra = ("pedidoId={0}" -f $pedidoId)
        }
      }
    }
  }

  if ($planilhaRows.Count -gt 0) {
    Emit 'Planilhas' $planilhaRows
  }

  $utf8Bom = New-Object System.Text.UTF8Encoding $true
  $lineArr = $lines.ToArray()
  $readme = @"
AcompOPMS — pasta Dados
=======================
Arquivo atual (unico CSV, sempre renovado ao criar documento na Timeline
ou ao importar planilha na aba Enviar):

  DadosOMPS (dd-MM-yyyy HH-mm-ss).csv

Abra no Excel (separador ;). A coluna Secao identifica o tipo de registro
(inclui Secao=Planilhas com CONMED/IMH/envios).
"@
  $written = @()
  foreach ($dadosDir in $dadosDirs) {
    $csvPath = Join-Path $dadosDir $fileName
    [IO.File]::WriteAllLines($csvPath, $lineArr, $utf8Bom)
    Set-Content -Path (Join-Path $dadosDir 'LEIA-ME-Dados.txt') -Value $readme -Encoding UTF8
    $written += $csvPath
  }

  foreach ($p in $written) { Write-Host "CSV gerado: $p" }
} finally {
  Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}
