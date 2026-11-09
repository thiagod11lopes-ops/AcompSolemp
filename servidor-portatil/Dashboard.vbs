' Abre o Dashboard do Servidor OMPS (pagina web local).
Option Explicit

Dim sh, fso, root, ps1, cmd, i
Dim candidates(3)
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)

' Funciona no projeto (servidor-portatil\) e no pack (Iniciar Servidor\).
candidates(0) = root & "\scripts\Abrir-Dashboard.ps1"
candidates(1) = root & "\AcompSolemp\servidor-portatil\scripts\Abrir-Dashboard.ps1"
candidates(2) = root & "\servidor-portatil\scripts\Abrir-Dashboard.ps1"
candidates(3) = root & "\..\AcompSolemp\servidor-portatil\scripts\Abrir-Dashboard.ps1"

ps1 = ""
For i = 0 To UBound(candidates)
  If fso.FileExists(candidates(i)) Then
    ps1 = fso.GetAbsolutePathName(candidates(i))
    Exit For
  End If
Next

If ps1 = "" Then
  MsgBox "Nao achei o Dashboard (Abrir-Dashboard.ps1)." & vbCrLf & vbCrLf & _
    "Procurei em:" & vbCrLf & _
    candidates(0) & vbCrLf & _
    candidates(1) & vbCrLf & _
    candidates(2), vbCritical, "Dashboard"
  WScript.Quit 1
End If

' 7 = janela minimizada: o usuario usa a janela do Dashboard; fechar o Dashboard encerra o PowerShell.
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """"
sh.Run cmd, 7, False
