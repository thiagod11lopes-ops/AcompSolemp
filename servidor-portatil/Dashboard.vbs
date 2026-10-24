' Abre o Dashboard do Servidor OMPS (pagina web local).
Option Explicit

Dim sh, fso, root, ps1, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = root & "\scripts\Abrir-Dashboard.ps1"

If Not fso.FileExists(ps1) Then
  MsgBox "Nao achei o Dashboard:" & vbCrLf & ps1, vbCritical, "Dashboard"
  WScript.Quit 1
End If

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """"
sh.Run cmd, 1, False
