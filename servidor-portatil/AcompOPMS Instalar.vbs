' Instalador unico AcompOPMS — escolhe Servidor ou Cliente.
' Pode ficar na raiz do pacote transferivel; procura o hub em varios layouts.
Option Explicit

Dim sh, fso, root, desk, ps1, cmd, tried, cand, i, walk, depth, p1
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
desk = ""
On Error Resume Next
desk = sh.SpecialFolders("Desktop")
On Error GoTo 0
tried = ""
ps1 = ""

Dim candidates
candidates = Array( _
  root & "\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\Gereal\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\Geral\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\Gereal\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\Geral\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\..\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\..\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1", _
  root & "\..\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1" _
)

' Layouts comuns na Area de Trabalho (mesmo se a pasta Iniciar Servidor estiver incompleta)
If desk <> "" Then
  ReDim Preserve candidates(UBound(candidates) + 6)
  candidates(UBound(candidates) - 5) = desk & "\Thiago\Projetos\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1"
  candidates(UBound(candidates) - 4) = desk & "\Transferir Servidor\Gereal\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1"
  candidates(UBound(candidates) - 3) = desk & "\Iniciar Servidor\Gereal\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1"
  candidates(UBound(candidates) - 2) = desk & "\Iniciar Servidor\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1"
  candidates(UBound(candidates) - 1) = desk & "\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1"
  candidates(UBound(candidates) - 0) = desk & "\Projetos\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1"
End If

For i = 0 To UBound(candidates)
  cand = candidates(i)
  If cand <> "" Then
    tried = tried & cand & vbCrLf
    If fso.FileExists(cand) Then
      ps1 = fso.GetAbsolutePathName(cand)
      Exit For
    End If
  End If
Next

If ps1 = "" Then
  walk = root
  For depth = 1 To 6
    p1 = walk & "\scripts\Hub-Instalacao-AcompOPMS.ps1"
    tried = tried & p1 & vbCrLf
    If fso.FileExists(p1) Then ps1 = fso.GetAbsolutePathName(p1) : Exit For
    p1 = walk & "\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1"
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
    "A pasta precisa conter o projeto (Gereal\AcompSolemp\servidor-portatil) ou o codigo em Thiago\Projetos\AcompSolemp." & vbCrLf & vbCrLf & _
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
