:: filepath: e:\crackleet\start_apps.bat

@echo off

:: Kill any running instance of injector.exe
taskkill /F /IM injector.exe >nul 2>&1

:: Start Electron App
cd new-electron
start "Electron App" cmd /c "npm run dev"

:: Wait for the Electron app to start
timeout /t 3 /nobreak >nul

:: Start Qt Injector
cd ../qt-injector
echo Starting injector...
start "Qt Injector" release\injector.exe

echo Both apps running!
pause