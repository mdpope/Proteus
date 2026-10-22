; Retain the exact installer for supervised compatible recovery. Application data
; lives outside $INSTDIR and is never deleted by install, upgrade or uninstall.
!macro customCheckAppRunning
  ; The independent updater runs from staging using its own Proteus.exe. Only
  ; check the target installation, and never kill a running app or its work.
  System::Call 'Kernel32::SetEnvironmentVariable(t "PROTEUS_INSTALL_TARGET", t "$INSTDIR")'
  ; NSIS is 32-bit. The native PowerShell can inspect a 64-bit app's module path.
  IfFileExists "$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe" 0 +2
    StrCpy $PowerShellPath "$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
  nsExec::Exec `"$PowerShellPath" -NoProfile -NonInteractive -Command "$$target=[System.IO.Path]::Combine($$env:PROTEUS_INSTALL_TARGET,'Proteus.exe'); foreach($$p in [System.Diagnostics.Process]::GetProcesses()){try{if($$p.MainModule.FileName -eq $$target){exit 1618}}catch{}}; exit 0"`
  Pop $0
  ${If} $0 != 0
    IfSilent +2
      MessageBox MB_OK|MB_ICONEXCLAMATION "Close this Proteus installation before installing. Active work was left running."
    SetErrorLevel 1618
    Quit
  ${EndIf}
!macroend

!macro customInstall
  CopyFiles /SILENT "$EXEPATH" "$INSTDIR\Proteus Setup.exe"
  WriteRegStr HKCU "Software\proteus\Proteus" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\proteus\Proteus" "Version" "${VERSION}"
  ; NSIS does not consume electron-builder's macOS/AppX protocol metadata.
  ; Register only our custom schemes for this user's installed executable.
  WriteRegStr HKCU "Software\Classes\proteus" "" "URL:Proteus chat link"
  WriteRegStr HKCU "Software\Classes\proteus" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\proteus\DefaultIcon" "" "$INSTDIR\Proteus.exe,0"
  WriteRegStr HKCU "Software\Classes\proteus\shell\open\command" "" '"$INSTDIR\Proteus.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\proteus-desktop" "" "URL:Proteus desktop sign-in"
  WriteRegStr HKCU "Software\Classes\proteus-desktop" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\proteus-desktop\DefaultIcon" "" "$INSTDIR\Proteus.exe,0"
  WriteRegStr HKCU "Software\Classes\proteus-desktop\shell\open\command" "" '"$INSTDIR\Proteus.exe" "%1"'
!macroend

!macro customUnInstall
  ; Leave handlers alone if another installation has taken ownership.
  ReadRegStr $0 HKCU "Software\Classes\proteus\shell\open\command" ""
  StrCmp $0 '"$INSTDIR\Proteus.exe" "%1"' 0 +2
    DeleteRegKey HKCU "Software\Classes\proteus"
  ReadRegStr $0 HKCU "Software\Classes\proteus-desktop\shell\open\command" ""
  StrCmp $0 '"$INSTDIR\Proteus.exe" "%1"' 0 +2
    DeleteRegKey HKCU "Software\Classes\proteus-desktop"
  DeleteRegKey HKCU "Software\proteus\Proteus"
!macroend
