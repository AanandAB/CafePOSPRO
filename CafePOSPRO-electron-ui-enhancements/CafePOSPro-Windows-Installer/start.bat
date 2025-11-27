@echo off
title CafePOSPro - Starting Application

echo Starting CafePOSPro...
echo.

cd /d "C:\CafePOSPro"

echo Starting development server with multi-terminal support...
echo.
echo The application will be available at:
echo   Local:    http://localhost:5173
echo   Network:  http://YOUR_LOCAL_IP:5173
echo.
echo To find your local IP address:
echo   Windows: Run 'ipconfig' in Command Prompt
echo   macOS:   Run 'ifconfig' in Terminal
echo.
echo For multi-terminal access:
echo   1. Ensure all devices are on the same WiFi network
echo   2. Access the above Network URL from other devices
echo   3. Refer to TECHNICAL_SETUP_GUIDE.txt for advanced configuration
echo.

npm run dev

pause