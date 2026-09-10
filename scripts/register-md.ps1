# Register ResearchMD as handler for .md files (current user).
# Run after install, or point -ExePath to a portable ResearchMD.exe.
param(
  [string]$ExePath = "$env:LOCALAPPDATA\ResearchMD\ResearchMD.exe"
)

if (-not (Test-Path $ExePath)) {
  Write-Error "ResearchMD.exe not found: $ExePath"
  exit 1
}

$progId = "ResearchMD.Markdown"
$classes = "HKCU:\Software\Classes"

New-Item -Path "$classes\$progId" -Force | Out-Null
Set-ItemProperty -Path "$classes\$progId" -Name "(Default)" -Value "Markdown Document (ResearchMD)"
New-Item -Path "$classes\$progId\DefaultIcon" -Force | Out-Null
Set-ItemProperty -Path "$classes\$progId\DefaultIcon" -Name "(Default)" -Value "`"$ExePath`",0"
New-Item -Path "$classes\$progId\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$classes\$progId\shell\open\command" -Name "(Default)" -Value "`"$ExePath`" `"%1`""

New-Item -Path "$classes\Applications\ResearchMD.exe\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$classes\Applications\ResearchMD.exe\shell\open\command" -Name "(Default)" -Value "`"$ExePath`" `"%1`""
Set-ItemProperty -Path "$classes\Applications\ResearchMD.exe" -Name "FriendlyAppName" -Value "ResearchMD"

foreach ($ext in @('.md', '.markdown', '.mdx')) {
  $base = "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\$ext"
  reg add "$base\OpenWithProgids" /v $progId /t REG_NONE /f | Out-Null
  reg add "$base\OpenWithList" /v "a" /t REG_SZ /d "ResearchMD.exe" /f | Out-Null
  # Remove stale UserChoice so Windows can re-pick
  reg delete "$base\UserChoice" /f 2>$null | Out-Null
}

$code = @'
using System;
using System.Runtime.InteropServices;
public class ShellNotify {
  [DllImport("shell32.dll")]
  public static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
'@
try {
  Add-Type $code -ErrorAction Stop
  [ShellNotify]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
} catch { }

Write-Host "Registered ResearchMD for .md / .markdown / .mdx"
Write-Host "  Exe: $ExePath"
Write-Host "If still missing in the picker: right-click .md -> Open with -> Choose another app"
