@echo off
rem L2 Bartz launcher: put this file in the "system" folder of a clean Lineage II High Five client and
rem double-click it to play on Bartz. No hosts file needed.
rem It looks up the server's address (play.l2-bartz.itjunior.dev) each time, so it keeps working if the IP changes.
rem L2.bin needs Administrator rights, so the script re-launches itself elevated if needed.
title L2 Bartz
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
cd /d "%~dp0"
if not exist "L2.bin" (
    echo.
    echo  L2.bin was not found next to this file.
    echo  Put start-L2-Bartz.bat in the "system" folder of your Lineage II High Five client and run it from there.
    echo.
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$server = 'play.l2-bartz.itjunior.dev'; $fallback = '79.97.146.142'; try { $ip = ([System.Net.Dns]::GetHostAddresses($server) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1).IPAddressToString } catch { $ip = $null }; if (-not $ip) { $ip = $fallback }; $p = New-Object System.Diagnostics.ProcessStartInfo; $p.FileName = (Join-Path (Get-Location) 'L2.bin'); $p.Arguments = ('IP=' + $ip); $p.WorkingDirectory = (Get-Location).Path; $p.UseShellExecute = $false; try { [void][System.Diagnostics.Process]::Start($p) } catch { Write-Host ('Could not start L2.bin: ' + $_.Exception.Message); pause }"
