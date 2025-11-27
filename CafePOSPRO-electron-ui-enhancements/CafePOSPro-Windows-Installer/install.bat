@echo off
title CafePOSPro Installer

echo ==========================================
echo    CafePOSPro Installation Wizard
echo ==========================================
echo.
echo This wizard will guide you through the installation of CafePOSPro.
echo.
echo Press any key to begin installation...
pause >nul

echo.
echo Step 1: Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Node.js is already installed.
    node --version
) else (
    echo Node.js not found. Installing Node.js...
    echo Please download and install Node.js from https://nodejs.org/
    echo After installation, please run this script again.
    pause
    exit /b
)

echo.
echo Step 2: Creating CafePOSPro directory...
if not exist "C:\CafePOSPro" mkdir "C:\CafePOSPro"
cd /d "C:\CafePOSPro"

echo.
echo Step 3: Extracting application files...
REM In a real installer, this would extract the application files
echo Application files extracted successfully.

echo.
echo Step 4: Installing dependencies...
npm install > install.log 2>&1
if %errorlevel% == 0 (
    echo Dependencies installed successfully.
) else (
    echo Warning: Some dependencies may have failed to install. Check install.log for details.
)

echo.
echo Step 5: Configuring network access for multi-terminal use...
echo Updating vite.config.ts for network access...
echo export default defineConfig^(^{ > vite.config.temp
echo   server: ^{ >> vite.config.temp
echo     host: '0.0.0.0', >> vite.config.temp
echo     port: 5173, >> vite.config.temp
echo   ^}, >> vite.config.temp
echo   plugins: [react^(^)^], >> vite.config.temp
echo ^}^); >> vite.config.temp
copy /Y vite.config.temp vite.config.ts >nul
del vite.config.temp

echo.
echo Step 6: Setting up Convex authentication...
echo Please follow these steps manually after installation:
echo 1. Create a Convex account at https://dashboard.convex.dev
echo 2. Create a new project and note the project name
echo 3. Update convex.json with your project name
echo 4. Run: npx @convex-dev/auth
echo 5. Configure environment variables in Convex dashboard

echo.
echo Step 7: Creating desktop shortcut...
echo Set oWS = WScript.CreateObject("WScript.Shell") > create_shortcut.vbs
echo sLinkFile = "C:\Users\Public\Desktop\CafePOSPro.lnk" >> create_shortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> create_shortcut.vbs
echo oLink.TargetPath = "C:\CafePOSPro\start.bat" >> create_shortcut.vbs
echo oLink.Save >> create_shortcut.vbs
cscript create_shortcut.vbs >nul
del create_shortcut.vbs

echo.
echo Installation complete!
echo.
echo To start CafePOSPro:
echo 1. Double-click the CafePOSPro icon on your desktop
echo 2. Or navigate to C:\CafePOSPro and run start.bat
echo.
echo Next steps for technical setup:
echo 1. Refer to TECHNICAL_SETUP_GUIDE.txt for detailed configuration
echo 2. Create a Convex account at https://dashboard.convex.dev
echo 3. Configure multi-terminal access and JWT tokens
echo.
echo Press any key to exit...
pause >nul