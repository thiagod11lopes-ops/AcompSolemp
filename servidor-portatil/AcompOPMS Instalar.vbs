' Instalador unico AcompOPMS — escolhe Servidor ou Cliente.
' Pode ficar na raiz do pacote transferivel; copie a pasta inteira para outro PC.
Option Explicit

Dim sh, fso, root, ps1, cmd, tried, cand, i, walk, depth, p1
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
tried = ""
ps1 = ""

Dim candidates
candidates = Array( _
  root & "\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\Gereal\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\Geral\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\Gereal\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\..\scripts\Hub-Instalacao-AcompOPMS.ps1" _
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
  walk = root
  For depth = 1 To 5
    p1 = walk & "\scripts\Hub-Instalacao-AcompOPMS.ps1"
    tried = tried & p1 & vbCrLf
    If fso.FileExists(p1) Then ps1 = fso.GetAbsolutePathName(p1) : Exit For
    p1 = walk & "\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1"
    tried = tried & p1 & vbCrLf
    If fso.FileExists(p1) Then ps1 = fso.GetAbsolutePathName(p1) : Exit For
    If fso.GetParentFolderName(walk) = walk Or fso.GetParentFolderName(walk) = "" Then Exit For
    walk = fso.GetParentFolderName(walk)
  Next
End If

If ps1 = "" Then
  MsgBox "Nao achei o instalador (Hub-Instalacao-AcompOPMS.ps1)." & vbCrLf & vbCrLf & _
    "Copie a pasta INTEIRA do pacote (com Gereal / servidor-portatil)." & vbCrLf & vbCrLf & _
    "VBS em:" & vbCrLf & WScript.ScriptFullName & vbCrLf & vbCrLf & _
    "Caminhos tentados:" & vbCrLf & tried, _
    vbCritical, "AcompOPMS Instalar"
  WScript.Quit 1
End If

cmd = "cmd.exe /c powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File " & _
      Chr(34) & ps1 & Chr(34) & _
      " || (echo. & echo ERRO ao abrir o instalador. & pause)"
sh.CurrentDirectory = fso.GetParentFolderName(ps1)
sh.Run cmd, 1, True
