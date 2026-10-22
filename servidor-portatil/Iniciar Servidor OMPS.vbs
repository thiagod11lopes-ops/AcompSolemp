' Atalho visual: inicia Docker + Supabase + app sem o usuario abrir PowerShell.
Option Explicit

Dim sh, fso, root, ps1, cmd, rc
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = root & "\scripts\Abrir-Tudo.ps1"

If Not fso.FileExists(ps1) Then
  MsgBox "Nao achei o script:" & vbCrLf & ps1, vbCritical, "Iniciar Servidor OMPS"
  WScript.Quit 1
End If

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """"
rc = sh.Run(cmd, 1, True)

If rc <> 0 Then
  MsgBox "Falha ao iniciar o servidor (codigo " & rc & ")." & vbCrLf & _
         "Veja a janela preta com a mensagem de erro.", vbExclamation, "Iniciar Servidor OMPS"
End If

WScript.Quit rc
