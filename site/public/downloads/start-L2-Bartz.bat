@echo off
rem L2 Bartz launcher: put this file in the system folder of a High Five client and double-click it to play.
rem L2.bin needs Administrator rights, so re-launch this script elevated if needed.
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = New-Object System.Diagnostics.ProcessStartInfo; $p.FileName = (Join-Path (Get-Location) 'L2.bin'); $p.Arguments = 'IP=play.l2-bartz.itjunior.dev'; $p.WorkingDirectory = (Get-Location).Path; $p.UseShellExecute = $false; try { [void][System.Diagnostics.Process]::Start($p) } catch { Write-Host ('Could not start L2.bin: ' + $_.Exception.Message); pause }"
