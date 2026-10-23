$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $projectRoot "src-tauri\target\release\my_workstation.exe"

if (-not (Test-Path $exe)) {
    Write-Error "Executable not found: $exe`nRun 'npm run tauri:build' first."
}

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "my_workstation.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = Split-Path -Parent $exe
$shortcut.IconLocation = "$exe,0"
$shortcut.Description = "my_workstation desktop app"
$shortcut.Save()

Write-Output "Desktop shortcut created: $shortcutPath"
Write-Output "Target: $exe"
