# Worker interno (nao chamar direto). Escuta UDP/53 e responde A para o alias.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$root = Get-ServidorRoot
$logDir = Join-Path $root 'logs'
$pidFile = Join-Path $logDir 'dns-alias.pid'
$stateFile = Join-Path $logDir 'dns-alias.state.json'
Set-Content -Path $pidFile -Value $PID -Encoding ASCII

if (-not (Test-Path $stateFile)) { throw "Estado DNS ausente: $stateFile" }
$st = Get-Content $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json
$alias = ([string]$st.alias).ToLowerInvariant().TrimEnd('.')
$ip = [string]$st.ip

Add-Type -TypeDefinition @'
using System;
using System.Net;
using System.Net.Sockets;
using System.Collections.Generic;
using System.Text;

public class AcompDns {
  static string Alias;
  static byte[] IpBytes;
  static UdpClient Udp;
  static volatile bool Run = true;

  public static void Start(string alias, string ip) {
    Alias = alias.ToLowerInvariant().TrimEnd('.');
    IpBytes = IPAddress.Parse(ip).GetAddressBytes();
    Udp = new UdpClient(new IPEndPoint(IPAddress.Any, 53));
    while (Run) {
      try {
        IPEndPoint ep = null;
        byte[] req = Udp.Receive(ref ep);
        byte[] resp = BuildResponse(req);
        if (resp != null) Udp.Send(resp, resp.Length, ep);
      } catch (SocketException) { }
      catch (ObjectDisposedException) { break; }
      catch { }
    }
  }

  static byte[] BuildResponse(byte[] req) {
    if (req == null || req.Length < 12) return null;
    string name; int qEnd; ushort qtype, qclass;
    if (!ParseQuestion(req, out name, out qEnd, out qtype, out qclass)) return null;
    bool match = string.Equals(name, Alias, StringComparison.OrdinalIgnoreCase);
    byte[] resp = new byte[512];
    Array.Copy(req, 0, resp, 0, 12);
    resp[2] = 0x81;
    resp[3] = match ? (byte)0x80 : (byte)0x83;
    resp[4] = req[4]; resp[5] = req[5];
    resp[6] = 0; resp[7] = (match && qtype == 1) ? (byte)1 : (byte)0;
    resp[8] = 0; resp[9] = 0;
    resp[10] = 0; resp[11] = 0;
    int p = 12;
    int qLen = qEnd - 12;
    Array.Copy(req, 12, resp, p, qLen);
    p += qLen;
    if (match && qtype == 1) {
      resp[p++] = 0xC0; resp[p++] = 0x0C;
      resp[p++] = 0; resp[p++] = 1;
      resp[p++] = 0; resp[p++] = 1;
      resp[p++] = 0; resp[p++] = 0; resp[p++] = 0; resp[p++] = 30;
      resp[p++] = 0; resp[p++] = 4;
      Array.Copy(IpBytes, 0, resp, p, 4); p += 4;
    }
    byte[] outb = new byte[p];
    Array.Copy(resp, 0, outb, 0, p);
    return outb;
  }

  static bool ParseQuestion(byte[] req, out string name, out int end, out ushort qtype, out ushort qclass) {
    name = null; end = 0; qtype = 0; qclass = 0;
    int i = 12;
    List<string> labels = new List<string>();
    while (i < req.Length) {
      int len = req[i++];
      if (len == 0) break;
      if ((len & 0xC0) == 0xC0) return false;
      if (i + len > req.Length) return false;
      labels.Add(Encoding.ASCII.GetString(req, i, len));
      i += len;
    }
    if (i + 4 > req.Length) return false;
    qtype = (ushort)((req[i] << 8) | req[i+1]);
    qclass = (ushort)((req[i+2] << 8) | req[i+3]);
    end = i + 4;
    name = string.Join(".", labels).ToLowerInvariant();
    return true;
  }
}
'@

[AcompDns]::Start($alias, $ip)
