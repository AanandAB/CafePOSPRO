@echo off
echo Getting network information...
echo =============================
powershell -ExecutionPolicy Bypass -File scripts/get_local_ip.ps1
echo =============================
echo.
echo Use the local_ip value above for your app configuration
pause