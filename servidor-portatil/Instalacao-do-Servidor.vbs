' Abre o assistente "Instalacao do Servidor" (etapas 1/N).
Option Explicit

Dim sh, fso, root, ps1, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = root & "\painel\Assistente-Instalacao-Servidor.ps1"

If Not fso.FileExists(ps1) Then
  ' Pacote "Iniciar Servidor": painel na raiz do pack
  ps1 = root & "\..\painel\Assistente-Instalacao-Servidor.ps1"
  If fso.FileExists(ps1) Then ps1 = fso.GetAbsolutePathName(ps1)
End If

If Not fso.FileExists(ps1) Then
  MsgBox "Nao achei Assistente-Instalacao-Servidor.ps1." & vbCrLf & vbCrLf & _
    root & "\painel\Assistente-Instalacao-Servidor.ps1", vbCritical, "Instalacao do Servidor"
  WScript.Quit 1
End If

cmd = "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File """ & ps1 & """"
sh.Run cmd, 1, True
