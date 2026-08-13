!undef APP_FILENAME
!define APP_FILENAME "groundcat"

; Older preview installers stored the internal package name as the install folder.
; Only migrate those exact generated folder names; preserve every custom path.
!macro customInit
  ${StdUtils.GetFileNamePart} $R8 "$INSTDIR"
  ${If} $R8 == "flyingmouse-format"
  ${OrIf} $R8 == "groundcat-format"
  ${OrIf} $R8 == "走地猫"
    ${StdUtils.GetParentPath} $R9 "$INSTDIR"
    StrCpy $INSTDIR "$R9\groundcat"
  ${EndIf}
!macroend
