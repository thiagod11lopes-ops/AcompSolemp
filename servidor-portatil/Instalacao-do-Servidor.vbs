' Abre o assistente "Instalacao do Servidor" (etapas 1/N).
' Caminhos com espaco (ex.: Transferir Servidor) exigem aspas corretas.
Option Explicit

Dim sh, fso, root, ps1, cmd, tried, cand, i
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
tried = ""
ps1 = ""

Dim candidates
candidates = Array( _
  root & "\painel\Assistente-Instalacao-Servidor.ps1", _
  root & "\Gereal\painel\Assistente-Instalacao-Servidor.ps1", _
  root & "\Geral\painel\Assistente-Instalacao-Servidor.ps1", _
  root & "\AcompSolemp\servidor-portatil\painel\Assistente-Instalacao-Servidor.ps1", _
  root & "\..\painel\Assistente-Instalacao-Servidor.ps1", _
  root & "\..\Gereal\painel\Assistente-Instalacao-Servidor.ps1", _
  root & "\servidor-portatil\painel\Assistente-Instalacao-Servidor.ps1" _
)

For i = 0 To UBound(candidates)
  cand = candidates(i)
  tried = tried & cand & vbCrLf
  If fso.FileExists(cand) Then
    ps1 = fso.GetAbsolutePathName(cand)
    Exit For
  End If
Next

If ps1 = "" Then
  Dim walk, depth, p1, p2
  walk = root
  For depth = 1 To 4
    p1 = walk & "\painel\Assistente-Instalacao-Servidor.ps1"
    p2 = walk & "\Gereal\painel\Assistente-Instalacao-Servidor.ps1"
    tried = tried & p1 & vbCrLf & p2 & vbCrLf
    If fso.FileExists(p1) Then ps1 = fso.GetAbsolutePathName(p1) : Exit For
    If fso.FileExists(p2) Then ps1 = fso.GetAbsolutePathName(p2) : Exit For
    If fso.GetParentFolderName(walk) = walk Or fso.GetParentFolderName(walk) = "" Then Exit For
    walk = fso.GetParentFolderName(walk)
  Next
End If

If ps1 = "" Then
  MsgBox "Nao achei Assistente-Instalacao-Servidor.ps1." & vbCrLf & vbCrLf & _
    "VBS em:" & vbCrLf & WScript.ScriptFullName & vbCrLf & vbCrLf & _
    "Caminhos tentados:" & vbCrLf & tried & vbCrLf & _
    "Copie a pasta INTEIRA ""Transferir Servidor"" (com a subpasta Gereal)." , _
    vbCritical, "Instalacao do Servidor"
  WScript.Quit 1
End If

' cmd /c + aspas: evita corte no espaco de "Transferir Servidor"
cmd = "cmd.exe /c powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File " & _
      Chr(34) & ps1 & Chr(34) & _
      " || (echo. & echo ERRO ao abrir o assistente. & pause)"
sh.CurrentDirectory = fso.GetParentFolderName(ps1)
sh.Run cmd, 1, True
