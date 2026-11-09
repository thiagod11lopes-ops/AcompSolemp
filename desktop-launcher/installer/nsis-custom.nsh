; Página extra no instalador NSIS (electron-builder): URL do sistema
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

Var AcompStartUrl
Var AcompUrlField

!macro customInit
  StrCpy $AcompStartUrl "https://thiagod11lopes-ops.github.io/AcompSolemp/"
!macroend

Function AcompUrlPage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Informe a URL do AcompOPMS (GitHub Pages ou servidor HTTPS):"
  Pop $0

  ${NSD_CreateText} 0 28u 100% 14u $AcompStartUrl
  Pop $AcompUrlField

  ${NSD_CreateLabel} 0 50u 100% 30u "Exemplo: https://thiagod11lopes-ops.github.io/AcompSolemp/$\r$\nApós publicar atualizações no GitHub, reabra o programa para carregar a versão nova (como no navegador)."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function AcompUrlPageLeave
  ${NSD_GetText} $AcompUrlField $AcompStartUrl
  ${If} $AcompStartUrl == ""
    MessageBox MB_ICONEXCLAMATION "Informe a URL." IDOK 0
    Abort
  ${EndIf}
FunctionEnd

!macro customPageAfterChangeDir
  !insertmacro MUI_HEADER_TEXT "URL do sistema" "Endereço web que o AcompOPMS abrirá (sem barra de endereços)."
  Page custom AcompUrlPage AcompUrlPageLeave
!macroend

!macro customInstall
  FileOpen $0 "$INSTDIR\acomopms-desktop.config.json" w
  FileWrite $0 "{$\"startUrl$\":$\"$AcompStartUrl$\",$\"productName$\":$\"AcompOPMS$\"}"
  FileClose $0
!macroend
