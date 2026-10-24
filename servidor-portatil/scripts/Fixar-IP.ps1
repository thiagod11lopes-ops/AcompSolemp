# Fixa o IP do adaptador Wi-Fi/Ethernet do servidor.
# PRECISA rodar o PowerShell como Administrador.
#
# Uso (padrão = valores atuais da rede 192.168.1.x):
#   .\Fixar-IP.ps1
# Ou customizado:
#   .\Fixar-IP.ps1 -IPAddress 192.168.1.202 -Gateway 192.168.1.1 -PrefixLength 24 -DnsServers 192.168.1.1,8.8.8.8

param(
  [string]$IPAddress = '192.168.1.202',
  [string]$Gateway = '192.168.1.1',
  [int]$PrefixLength = 24,
  [string[]]$DnsServers = @('192.168.1.1', '8.8.8.8'),
  [string]$AdapterName = ''
)

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  throw "Abra o PowerShell como Administrador (botão direito → Executar como administrador) e rode de novo."
}

if (-not $AdapterName) {
  $cand = Get-NetIPConfiguration |
    Where-Object {
      $_.IPv4DefaultGateway -and
      $_.NetAdapter.Status -eq 'Up' -and
      $_.InterfaceAlias -notlike 'vEthernet*' -and
      $_.InterfaceAlias -notlike '*Bluetooth*'
    } |
    Select-Object -First 1
  if (-not $cand) { throw "Não achei adaptador de rede com gateway. Conecte Wi-Fi/cabo e tente de novo." }
  $AdapterName = $cand.InterfaceAlias
}

Write-Host "Adaptador: $AdapterName"
Write-Host "IP fixo:   $IPAddress/$PrefixLength"
Write-Host "Gateway:   $Gateway"
Write-Host "DNS:       $($DnsServers -join ', ')"

# Remove IPv4 dinâmico/antigo e aplica estático
Get-NetIPAddress -InterfaceAlias $AdapterName -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '169.*' } |
  ForEach-Object {
    Remove-NetIPAddress -InterfaceAlias $AdapterName -IPAddress $_.IPAddress -Confirm:$false -ErrorAction SilentlyContinue
  }

Get-NetRoute -InterfaceAlias $AdapterName -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
  Remove-NetRoute -Confirm:$false -ErrorAction SilentlyContinue

New-NetIPAddress -InterfaceAlias $AdapterName -IPAddress $IPAddress -PrefixLength $PrefixLength -DefaultGateway $Gateway | Out-Null
Set-DnsClientServerAddress -InterfaceAlias $AdapterName -ServerAddresses $DnsServers

# Desliga DHCP nesse adaptador (via netsh, mais confiável em Wi-Fi)
netsh interface ip set address name="$AdapterName" static $IPAddress 255.255.255.0 $Gateway | Out-Null
netsh interface ip set dns name="$AdapterName" static $($DnsServers[0]) | Out-Null
if ($DnsServers.Count -gt 1) {
  netsh interface ip add dns name="$AdapterName" $($DnsServers[1]) index=2 | Out-Null
}

Write-Host ""
Write-Host "IP fixado. Confira com: ipconfig"
Write-Host "Depois rode Aplicar-Host.ps1 com este IP e reinicie o servidor AcompOPMS."
Write-Host "  .\Aplicar-Host.ps1 -HostAddress $IPAddress"
