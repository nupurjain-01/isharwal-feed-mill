$desktopPath = [System.Environment]::GetFolderPath('Desktop')
if (-not $desktopPath -or -not (Test-Path $desktopPath)) {
    if (Test-Path "$HOME\OneDrive\Desktop") {
        $desktopPath = "$HOME\OneDrive\Desktop"
    } elseif (Test-Path "$HOME\Desktop") {
        $desktopPath = "$HOME\Desktop"
    } else {
        $desktopPath = $env:USERPROFILE + "\Desktop"
    }
}

$shortcutFile = Join-Path $desktopPath "Isharwal Feed Mill Gate Entry.lnk"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutFile)
$shortcut.TargetPath = "C:\Users\HP\.gemini\antigravity\scratch\ifm-gate-entry\run_ifm.bat"
$shortcut.WorkingDirectory = "C:\Users\HP\.gemini\antigravity\scratch\ifm-gate-entry"
$shortcut.IconLocation = "C:\Users\HP\.gemini\antigravity\scratch\ifm-gate-entry\assets\icon.ico, 0"
$shortcut.Description = "Isharwal Feed Mill - Gate Entry Management System"
$shortcut.Save()

if (Test-Path $shortcutFile) {
    Write-Output "SUCCESS: Created desktop shortcut at $shortcutFile"
} else {
    Write-Output "ERROR: Could not verify shortcut."
}
