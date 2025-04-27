:: filepath: e:\crackleet\start_apps.bat

@echo off

:: Start Electron App
cd electron-app
start cmd /k "npm start"

:: Wait for the Electron app to start
timeout /t 3 /nobreak >nul

:: Start Qt Injector
cd ../qt-injector
echo Starting injector...
cmd /k "release\injector.exe"

echo Both apps running!
pause