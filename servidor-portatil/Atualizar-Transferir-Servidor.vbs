' Atualiza Desktop\Transferir Servidor a partir do projeto (copia real).
Option Explicit

Dim sh, fso, root, ps1, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = root & "\scripts\Atualizar-Transferir-Servidor.ps1"

If Not fso.FileExists(ps1) Then
  MsgBox "Nao achei:" & vbCrLf & ps1, vbCritical, "Atualizar Transferir Servidor"
  WScript.Quit 1
End If

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """"
sh.Run cmd, 1, True
