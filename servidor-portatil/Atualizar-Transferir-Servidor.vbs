' Atualiza Desktop\Transferir Servidor (copia real).
' Usa cmd para aspas corretas e janela visivel.
Option Explicit

Dim sh, fso, root, cmdFile, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
cmdFile = root & "\Atualizar-Transferir-Servidor.cmd"

If Not fso.FileExists(cmdFile) Then
  MsgBox "Nao achei:" & vbCrLf & cmdFile, vbCritical, "Atualizar Transferir Servidor"
  WScript.Quit 1
End If

' /k deixa a janela aberta se der erro; o .cmd ja tem pause
cmd = "cmd.exe /c " & Chr(34) & cmdFile & Chr(34)
sh.Run cmd, 1, True
