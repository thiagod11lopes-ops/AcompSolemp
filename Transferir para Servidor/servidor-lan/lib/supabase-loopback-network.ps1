# Prepara a rede Docker que publica as portas do Supabase só em 127.0.0.1.
# Não apaga volumes nem redes.

function Get-AcompSupabaseLoopbackNetwork {
  param([Parameter(Mandatory = $true)][string]$LanDir)

  $helper = Join-Path $LanDir 'lib\ensure-supabase-loopback-network.mjs'
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $raw = & node $helper
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao preparar a rede Docker de loopback do Supabase (exit $LASTEXITCODE)."
    }
  } finally {
    $ErrorActionPreference = $previous
  }

  $name = @($raw | Where-Object { "$_".Trim() })[-1]
  $name = "$name".Trim()
  if ($name -ne 'acomopms-supabase-loopback') {
    throw "Nome de rede Docker inesperado: '$name'"
  }
  return $name
}
