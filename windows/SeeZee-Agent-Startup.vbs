REM SeeZee Agent Hidden Launcher (VBScript wrapper)
REM This can be placed in shell:startup and will start the agent silently
REM
REM Usage: Copy to C:\Users\{YourUser}\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\
REM

CreateObject("WScript.Shell").Run "cmd /c " & Chr(34) & CreateObject("System.IO.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\..\seezee-agent-launcher.bat" & Chr(34), 0, False
