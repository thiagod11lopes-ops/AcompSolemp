/** @param {{ privateKey: string, address: string, listenPort: number }} opts */
export function buildServerWireGuardConf(opts) {
  return `[Interface]
PrivateKey = ${opts.privateKey}
Address = ${opts.address}
ListenPort = ${opts.listenPort}

# Pares cliente (connection.json / Etapa 6) adicionados abaixo:
# [Peer]
# PublicKey = ...
# AllowedIPs = 100.64.0.2/32
`
}
