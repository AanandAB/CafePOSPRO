@echo off
title CafePOSPro EXE Builder

echo ==========================================
echo    CafePOSPro EXE Build Script
echo ==========================================
echo.

echo Step 1: Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Building the application...
cd cafepospro-app
npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install app dependencies
    pause
    exit /b 1
)

echo.
echo Building the web application...
npm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build the web application
    pause
    exit /b 1
)

cd ..

echo.
echo Step 3: Creating EXE package...
npm run dist
if %errorlevel% neq 0 (
    echo Error: Failed to create EXE package
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo.
echo The EXE installer can be found in the dist folder.
echo.
pause